import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { recordAudit } from "../utils/audit.js";
import { notifyAbsenceDecision, notifyAbsenceRequest } from "../notifications/notify.js";

export const absencesRouter = Router();
absencesRouter.use(requireAuth);

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kuupäev peab olema kujul YYYY-MM-DD");

const listQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  from: DATE.optional(),
  to: DATE.optional(),
  status: z.enum(["approved", "pending", "rejected"]).optional(),
});

/**
 * Puudumiste nimekiri. Töötaja näeb ainult enda omi; admin kõiki ja saab
 * `userId`-ga filtreerida.
 */
absencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, from, to, status } = listQuerySchema.parse(req.query);
    const isAdmin = req.user!.role === "admin";

    const absences = await prisma.absence.findMany({
      where: {
        organizationId: req.user!.organizationId,
        // Töötaja ei tohi näha kolleegide haiguslehti.
        userId: isAdmin ? userId : req.user!.sub,
        ...(status ? { status } : {}),
        ...(from ? { endDate: { gte: from } } : {}),
        ...(to ? { startDate: { lte: to } } : {}),
      },
      include: { user: { select: { id: true, username: true } } },
      // Ootel taotlused ette: neid on vaja otsustada, ülejäänu on ajalugu.
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });

    res.json({
      absences,
      pending: isAdmin
        ? await prisma.absence.count({
            where: { organizationId: req.user!.organizationId, status: "pending" },
          })
        : absences.filter((a) => a.status === "pending").length,
    });
  })
);

const createSchema = z
  .object({
    userId: z.number().int().positive(),
    type: z.enum(["vacation", "sick", "unpaid", "other"]),
    startDate: DATE,
    endDate: DATE,
    comment: z.string().max(500).optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Lõppkuupäev ei tohi olla alguskuupäevast varasem.",
    path: ["endDate"],
  });

/**
 * Puudumise loomine.
 *
 * KAKS ERI ASJA sama otspunkti taga, sest kirje ise on sama:
 *
 *   HALDUR sisestab juba otsustatud puudumise (`approved`) ükskõik kellele.
 *          Tema kirje ongi kinnitatud fakt.
 *   TÖÖTAJA esitab TAOTLUSE (`pending`) ainult iseenda kohta. Ootel
 *          taotlus ei vähenda kuu normi enne kinnitamist.
 *
 * Varem sai siia ainult haldur ja töötaja jaoks oli "Puudumised" pelgalt
 * nimekiri — nuppu, millega midagi teha, ei olnud.
 */
absencesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const isAdmin = req.user!.role === "admin";

    // Töötaja saab taotleda ainult iseenda puudumist.
    const targetUserId = isAdmin ? data.userId : req.user!.sub;

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: req.user!.organizationId },
      select: { id: true, username: true },
    });
    if (!user) throw new HttpError(404, req.m.users.notFound);

    // Kattuv puudumine on peaaegu alati eksitus (nt sama puhkus sisestatud
    // kaks korda) ja tekitaks normi arvutuses segadust.
    const overlapping = await prisma.absence.findFirst({
      where: {
        userId: targetUserId,
        // Tagasi lükatud taotlus ei blokeeri uut — see ongi mõte, et
        // paranduse saab uuesti esitada.
        status: { not: "rejected" },
        startDate: { lte: data.endDate },
        endDate: { gte: data.startDate },
      },
    });
    if (overlapping) {
      throw new HttpError(409, req.m.absences.overlapping(overlapping.startDate, overlapping.endDate));
    }

    const absence = await prisma.absence.create({
      data: {
        ...data,
        userId: targetUserId,
        organizationId: req.user!.organizationId,
        createdById: req.user!.sub,
        status: isAdmin ? "approved" : "pending",
      },
      include: { user: { select: { id: true, username: true } } },
    });

    if (!isAdmin) {
      notifyAbsenceRequest(req.user!.organizationId, user.username, absence.id);
    }

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "absence",
      entityId: absence.id,
      action: isAdmin ? "create" : "request",
      changes: {
        userId: { from: null, to: targetUserId },
        status: { from: null, to: absence.status },
        type: { from: null, to: data.type },
        period: { from: null, to: `${data.startDate} – ${data.endDate}` },
      },
      reason: data.comment,
    });

    res.status(201).json(absence);
  })
);

const decisionSchema = z.object({
  comment: z.string().max(500).optional(),
});

/**
 * Halduri otsus taotluse kohta.
 *
 * Kinnitamine teeb taotlusest päris puudumise, mis hakkab kuu normi
 * vähendama. Tagasilükkamine jätab kirje alles koos põhjendusega — nii
 * näeb töötaja, MIKS otsus selline oli, ja saab vajadusel uue esitada.
 *
 * Mõlemad lähevad audit-logisse: puudumine mõjutab normi ja seeläbi
 * seda, kas keegi paistab alatäitjana.
 */
function decide(approved: boolean) {
  return asyncHandler(async (req: import("express").Request, res: import("express").Response) => {
    const id = Number(req.params.id);
    const { comment } = decisionSchema.parse(req.body ?? {});

    const absence = await prisma.absence.findFirst({
      where: { id, organizationId: req.user!.organizationId },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!absence) throw new HttpError(404, req.m.absences.notFound);
    if (absence.status !== "pending") throw new HttpError(409, req.m.absences.alreadyDecided);

    const updated = await prisma.absence.update({
      where: { id },
      data: {
        status: approved ? "approved" : "rejected",
        decidedAt: new Date(),
        decidedById: req.user!.sub,
        decisionComment: comment,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "absence",
      entityId: id,
      action: approved ? "approve" : "reject",
      changes: { status: { from: "pending", to: updated.status } },
      reason: comment,
    });

    notifyAbsenceDecision(absence.user.id, approved, `${absence.startDate} – ${absence.endDate}`);

    res.json(updated);
  });
}

absencesRouter.post("/:id/approve", requireAdmin, decide(true));
absencesRouter.post("/:id/reject", requireAdmin, decide(false));

/**
 * Kustutamine.
 *
 * Haldur võib kustutada iga kirje. Töötaja võib tagasi võtta ainult OMA
 * OOTEL taotluse — kinnitatud puudumise kustutamine muudaks kuu normi ja
 * see peab jääma halduri otsuseks.
 */
absencesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const isAdmin = req.user!.role === "admin";
    const absence = await prisma.absence.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!absence) throw new HttpError(404, req.m.absences.notFound);

    if (!isAdmin && !(absence.userId === req.user!.sub && absence.status === "pending")) {
      throw new HttpError(403, req.m.absences.cannotWithdraw);
    }

    await prisma.absence.delete({ where: { id } });

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "absence",
      entityId: id,
      action: "delete",
      changes: {
        period: { from: `${absence.startDate} – ${absence.endDate}`, to: null },
        type: { from: absence.type, to: null },
      },
    });

    res.status(204).end();
  })
);
