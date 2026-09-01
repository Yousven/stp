import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";

/**
 * Kahtlase tegevuse märked.
 *
 * Kaks vaadet, sest kaks eri vajadust:
 *   - TÖÖTAJA näeb ainult enda märkeid ja saab need teadmiseks võtta.
 *     Kui keegi kasutab tema kontot, on see ainus viis seda avastada.
 *   - HALDUR näeb kogu ettevõtet ja märgib juhtumi läbivaadatuks.
 *
 * Kumbki vaade ei muuda tunde. Parandamiseks on olemas käsitsi muudatus,
 * mis nõuab põhjendust ja läheb audit-logisse.
 */
export const meAlertsRouter = Router();
export const alertsRouter = Router();

meAlertsRouter.use(requireAuth);
alertsRouter.use(requireAuth, requireAdmin);

/** Kui palju märkeid korraga tagastame. */
const PAGE_SIZE = 50;

interface AlertRow {
  id: number;
  type: string;
  details: string;
  createdAt: Date;
  seenAt: Date | null;
  reviewedAt: Date | null;
  timeLogId: number | null;
}

function shape(alert: AlertRow) {
  let details: unknown = {};
  try {
    details = JSON.parse(alert.details);
  } catch {
    // Vigane JSON ei tohi vaadet maha võtta.
  }
  return {
    id: alert.id,
    type: alert.type,
    details,
    createdAt: alert.createdAt,
    seenAt: alert.seenAt,
    reviewedAt: alert.reviewedAt,
    timeLogId: alert.timeLogId,
  };
}

/** Töötaja enda märked, uuemad ees. */
meAlertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const alerts = await prisma.securityAlert.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    });
    res.json({
      alerts: alerts.map(shape),
      unseen: alerts.filter((a) => a.seenAt == null).length,
    });
  })
);

/** Töötaja võttis märke teadmiseks — bänner kaob. */
meAlertsRouter.post(
  "/:id/seen",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const alert = await prisma.securityAlert.findFirst({
      where: { id, userId: req.user!.sub },
      select: { id: true },
    });
    if (!alert) throw new HttpError(404, req.m.alerts.notFound);

    const updated = await prisma.securityAlert.update({
      where: { id },
      data: { seenAt: new Date() },
    });
    res.json(shape(updated));
  })
);

/** Halduri vaade: kogu ettevõte, läbi vaatamata ees. */
alertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const alerts = await prisma.securityAlert.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: [{ reviewedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      take: PAGE_SIZE,
      include: { user: { select: { id: true, username: true } } },
    });

    res.json({
      alerts: alerts.map((a) => ({ ...shape(a), user: a.user })),
      open: alerts.filter((a) => a.reviewedAt == null).length,
    });
  })
);

/** Haldur vaatas juhtumi läbi. Tunde see ei muuda. */
alertsRouter.post(
  "/:id/review",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const alert = await prisma.securityAlert.findFirst({
      where: { id, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!alert) throw new HttpError(404, req.m.alerts.notFound);

    const updated = await prisma.securityAlert.update({
      where: { id },
      data: { reviewedAt: new Date(), reviewedBy: req.user!.sub },
    });
    res.json(shape(updated));
  })
);
