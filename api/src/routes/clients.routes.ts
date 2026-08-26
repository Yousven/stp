import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";

export const clientsRouter = Router();
clientsRouter.use(requireAuth, requireAdmin);

clientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const clients = await prisma.client.findMany({
      where: { organizationId: req.user!.organizationId, deleted: false },
      orderBy: { name: "asc" },
      include: { _count: { select: { objects: true, invoices: true } } },
    });
    res.json(clients);
  })
);

const clientSchema = z.object({
  name: z.string().min(1).max(255),
  registryCode: z.string().max(40).nullable().optional(),
  vatNumber: z.string().max(40).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().max(255).nullable().optional(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
});

function normalize(data: z.infer<typeof clientSchema>) {
  return {
    name: data.name,
    registryCode: data.registryCode || null,
    vatNumber: data.vatNumber || null,
    email: data.email || null,
    address: data.address || null,
    ...(data.paymentTermDays === undefined ? {} : { paymentTermDays: data.paymentTermDays }),
    ...(data.vatRate === undefined ? {} : { vatRate: data.vatRate }),
    notes: data.notes || null,
  };
}

clientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    // Uue tellija käibemaksumäär tuleb ettevõtte vaikeväärtusest, et
    // igal lisamisel ei peaks sama numbrit uuesti sisestama.
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { defaultVatRate: true },
    });

    try {
      const created = await prisma.client.create({
        data: {
          organizationId,
          vatRate: org.defaultVatRate,
          ...normalize(data),
        },
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, req.m.clients.duplicate);
      }
      throw err;
    }
  })
);

clientsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = clientSchema.parse(req.body);

    const existing = await prisma.client.findFirst({
      where: { id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw new HttpError(404, req.m.clients.notFound);

    try {
      const updated = await prisma.client.update({ where: { id }, data: normalize(data) });
      res.json(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, req.m.clients.duplicate);
      }
      throw err;
    }
  })
);

/**
 * Eemaldamine on pehme, aga ainult siis, kui tellijal ei ole enam objekte.
 * Objektiga seotud tellija peitmine jätaks objekti arvelduse õhku rippuma,
 * ilma et keegi seda märkaks.
 */
clientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.client.findFirst({
      where: { id, organizationId: req.user!.organizationId },
      include: { _count: { select: { objects: true } } },
    });
    if (!existing) throw new HttpError(404, req.m.clients.notFound);
    if (existing._count.objects > 0) throw new HttpError(409, req.m.clients.hasObjects);

    await prisma.client.update({ where: { id }, data: { deleted: true } });
    res.status(204).end();
  })
);
