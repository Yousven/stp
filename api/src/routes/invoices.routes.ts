import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { recordAudit } from "../utils/audit.js";
import { aggregateBilling, dueDateFrom, invoiceTotals, nextInvoiceNumber } from "../utils/billing.js";
import { loadBillingData } from "../utils/billingQuery.js";
import { renderInvoiceHtml, type InvoicePartySnapshot } from "../utils/invoiceHtml.js";
import { sendEmail } from "../notifications/email.js";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth, requireAdmin);

const listQuerySchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "sent", "paid", "void"]).optional(),
});

invoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId, status } = listQuerySchema.parse(req.query);
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(clientId ? { clientId } : {}),
        ...(status ? { status } : {}),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ issueDate: "desc" }, { id: "desc" }],
    });
    res.json(invoices);
  })
);

const createSchema = z.object({
  clientId: z.number().int().positive(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Ainult ühe objekti tunnid; puudumisel kõik selle tellija objektid. */
  objectId: z.number().int().positive().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(2000).nullable().optional(),
});

/**
 * Arve koostamine perioodi tundidest.
 *
 * Arvele lähevad ainult need tunnid, millel on tunnihind olemas. Hinnata
 * tunnid jäävad teadlikult välja ja jäävad edasi ootama — need saab
 * hiljem, pärast hinna määramist, uuele arvele panna. Vastupidine valik
 * (paneme need nulliga arvele) tähendaks töö vaikset kinkimist.
 *
 * Arvele läinud töölogid margitakse `invoiceId` väljaga, mis hoiab ära
 * sama tunni teistkordse arveldamise.
 */
invoicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, organizationId },
    });
    if (!client) throw new HttpError(404, req.m.clients.notFound);

    const seller = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (!seller.registryCode) throw new HttpError(400, req.m.invoices.sellerDetailsMissing);

    const { logs, sources } = await loadBillingData({
      organizationId,
      clientId: data.clientId,
      objectId: data.objectId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    });

    const { clients } = aggregateBilling(logs, sources);
    const entry = clients.find((c) => c.clientId === data.clientId);

    const lines = (entry?.objects ?? [])
      .flatMap((object) => object.lines)
      .filter((line) => line.rate !== null && line.hours > 0)
      .map((line) => ({
        objectId: line.objectId,
        workTypeId: line.workTypeId,
        description: `${line.objectName} — ${line.workTypeName ?? "Määramata tööliik"}`,
        hours: line.hours,
        rate: line.rate!,
        amount: Math.round(line.hours * line.rate! * 100) / 100,
        logIds: line.logIds,
      }));

    if (lines.length === 0) throw new HttpError(400, req.m.invoices.noBillableHours);

    const vatRate = Number(client.vatRate);
    const totals = invoiceTotals(lines, vatRate);
    const issueDate = data.issueDate ?? new Date().toLocaleDateString("sv-SE");

    const sellerSnapshot: InvoicePartySnapshot = {
      name: seller.name,
      registryCode: seller.registryCode,
      vatNumber: seller.vatNumber,
      address: seller.address,
      email: seller.email,
      phone: seller.phone,
      iban: seller.iban,
    };
    const clientSnapshot: InvoicePartySnapshot = {
      name: client.name,
      registryCode: client.registryCode,
      vatNumber: client.vatNumber,
      address: client.address,
      email: client.email,
    };

    const invoice = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findMany({
        where: { organizationId },
        select: { number: true },
      });
      const number = nextInvoiceNumber(
        existing.map((i) => i.number),
        Number(issueDate.slice(0, 4))
      );

      const created = await tx.invoice.create({
        data: {
          organizationId,
          clientId: client.id,
          number,
          status: "draft",
          issueDate,
          dueDate: dueDateFrom(issueDate, client.paymentTermDays),
          periodFrom: data.dateFrom,
          periodTo: data.dateTo,
          clientSnapshot: JSON.stringify(clientSnapshot),
          sellerSnapshot: JSON.stringify(sellerSnapshot),
          vatRate,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          note: data.note ?? null,
          createdById: req.user!.sub,
          lines: {
            create: lines.map((line) => ({
              objectId: line.objectId,
              workTypeId: line.workTypeId,
              description: line.description,
              hours: line.hours,
              rate: line.rate,
              amount: line.amount,
            })),
          },
        },
        include: { lines: true },
      });

      // Tunnid lukku alles siis, kui arve on päriselt olemas.
      await tx.timeLog.updateMany({
        where: { id: { in: lines.flatMap((l) => l.logIds) } },
        data: { invoiceId: created.id },
      });

      return created;
    });

    await recordAudit({
      organizationId,
      actorUserId: req.user!.sub,
      entityType: "invoice",
      entityId: invoice.id,
      action: "create",
      changes: { number: { from: null, to: invoice.number }, total: { from: null, to: totals.total } },
    });

    res.status(201).json(invoice);
  })
);

async function findOwnInvoiceOr404(id: number, organizationId: number, notFound: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { lines: true, client: true },
  });
  if (!invoice) throw new HttpError(404, notFound);
  return invoice;
}

invoicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await findOwnInvoiceOr404(
      Number(req.params.id),
      req.user!.organizationId,
      req.m.invoices.notFound
    );
    res.json({
      ...invoice,
      seller: JSON.parse(invoice.sellerSnapshot),
      clientDetails: JSON.parse(invoice.clientSnapshot),
    });
  })
);

/**
 * Lühiajaline link arve trükivaatele.
 *
 * Trükivaade peab avanema süsteemi brauseris, kuhu äpi Bearer-token kaasa
 * ei lähe. Seetõttu antakse eraldi 15-minutiline token, mis kehtib ainult
 * ühe arve kohta ja ei anna ligipääsu millelegi muule — sisselogimise
 * tokenit URL-i panna ei tohi, sest URL-id jäävad logidesse ja ajalukku.
 */
invoicesRouter.get(
  "/:id/print-token",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await findOwnInvoiceOr404(id, req.user!.organizationId, req.m.invoices.notFound);

    const token = jwt.sign(
      { invoiceId: id, organizationId: req.user!.organizationId, purpose: "invoice-print" },
      env.jwtAccessSecret,
      { expiresIn: "15m" }
    );
    res.json({ token, path: `/invoices/${id}/html?t=${encodeURIComponent(token)}` });
  })
);

const statusSchema = z.object({ status: z.enum(["draft", "sent", "paid"]) });

invoicesRouter.post(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    const id = Number(req.params.id);
    const invoice = await findOwnInvoiceOr404(id, req.user!.organizationId, req.m.invoices.notFound);
    if (invoice.status === "void") throw new HttpError(409, req.m.invoices.alreadyVoided);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        sentAt: status === "sent" ? (invoice.sentAt ?? new Date()) : invoice.sentAt,
        paidAt: status === "paid" ? (invoice.paidAt ?? new Date()) : status === "draft" ? null : invoice.paidAt,
      },
    });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "invoice",
      entityId: id,
      action: "status",
      changes: { status: { from: invoice.status, to: status } },
    });

    res.json(updated);
  })
);

/**
 * Arve tühistamine vabastab tunnid.
 *
 * Numbrit ei kasutata uuesti ja arvet ei kustutata — tühistatud arve peab
 * jääma nähtavaks, muidu tekiks nummerdusse auk, mille kohta ei ole
 * selgitust. Tunnid lähevad tagasi arveldamata hulka ja saab uuele arvele
 * panna.
 */
invoicesRouter.post(
  "/:id/void",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const invoice = await findOwnInvoiceOr404(id, req.user!.organizationId, req.m.invoices.notFound);
    if (invoice.status === "void") throw new HttpError(409, req.m.invoices.alreadyVoided);
    if (invoice.status === "paid") throw new HttpError(409, req.m.invoices.cannotVoidPaid);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.timeLog.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
      return tx.invoice.update({ where: { id }, data: { status: "void" } });
    });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "invoice",
      entityId: id,
      action: "void",
      changes: { status: { from: invoice.status, to: "void" } },
    });

    res.json(updated);
  })
);

/**
 * Arve saatmine tellija e-postile.
 *
 * Saadetakse tekstikokkuvõte; ilma seadistatud SMTP-ta kirjutatakse see
 * ainult logisse (vt notifications/email.ts) ja arve märgitakse ikkagi
 * saadetuks, sest saatmise otsuse tegi admin.
 */
invoicesRouter.post(
  "/:id/send",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const invoice = await findOwnInvoiceOr404(id, req.user!.organizationId, req.m.invoices.notFound);
    if (invoice.status === "void") throw new HttpError(409, req.m.invoices.alreadyVoided);

    const client: InvoicePartySnapshot = JSON.parse(invoice.clientSnapshot);
    const seller: InvoicePartySnapshot = JSON.parse(invoice.sellerSnapshot);

    let emailed = false;
    if (client.email) {
      const body = [
        `Tere, ${client.name}!`,
        "",
        `Esitame arve ${invoice.number} perioodi ${invoice.periodFrom} – ${invoice.periodTo} eest.`,
        "",
        ...invoice.lines.map((l) => `  ${l.description}: ${Number(l.hours).toFixed(2)} h × ${Number(l.rate).toFixed(2)} € = ${Number(l.amount).toFixed(2)} €`),
        "",
        `Summa ilma käibemaksuta: ${Number(invoice.subtotal).toFixed(2)} €`,
        `Käibemaks ${Number(invoice.vatRate).toFixed(0)}%: ${Number(invoice.vatAmount).toFixed(2)} €`,
        `Tasumisele kuulub: ${Number(invoice.total).toFixed(2)} €`,
        `Maksetähtaeg: ${invoice.dueDate}`,
        seller.iban ? `Arveldusarve: ${seller.iban}` : "",
        "",
        seller.name,
      ].join("\n");

      emailed = await sendEmail(client.email, `Arve ${invoice.number} — ${seller.name}`, body);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: invoice.status === "draft" ? "sent" : invoice.status, sentAt: invoice.sentAt ?? new Date() },
    });

    res.json({ ...updated, emailed, clientEmail: client.email ?? null });
  })
);

/**
 * Arve trükivaade eraldi, autentimata routeris.
 *
 * Ligipääs käib `print-token` kaudu saadud lühiajalise allkirjaga, mitte
 * sisselogimise tokeniga: nii saab lingi avada süsteemi brauseris ja sealt
 * "Prindi → Salvesta PDF-ina", ilma et sessioon URL-i lekiks.
 */
export const invoicePrintRouter = Router();

invoicePrintRouter.get(
  "/:id/html",
  asyncHandler(async (req, res) => {
    const token = typeof req.query.t === "string" ? req.query.t : null;
    if (!token) throw new HttpError(401, req.m.access.missingAuth);

    let payload: { invoiceId?: number; organizationId?: number; purpose?: string };
    try {
      payload = jwt.verify(token, env.jwtAccessSecret) as typeof payload;
    } catch {
      throw new HttpError(401, req.m.access.invalidToken);
    }

    const id = Number(req.params.id);
    if (payload.purpose !== "invoice-print" || payload.invoiceId !== id) {
      throw new HttpError(403, req.m.access.forbidden);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: payload.organizationId },
      include: { lines: true },
    });
    if (!invoice) throw new HttpError(404, req.m.invoices.notFound);

    res.type("html").send(
      renderInvoiceHtml({
        number: invoice.number,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        periodFrom: invoice.periodFrom,
        periodTo: invoice.periodTo,
        status: invoice.status,
        seller: JSON.parse(invoice.sellerSnapshot),
        client: JSON.parse(invoice.clientSnapshot),
        lines: invoice.lines.map((l) => ({
          description: l.description,
          hours: Number(l.hours),
          rate: Number(l.rate),
          amount: Number(l.amount),
        })),
        vatRate: Number(invoice.vatRate),
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vatAmount),
        total: Number(invoice.total),
        note: invoice.note,
      })
    );
  })
);
