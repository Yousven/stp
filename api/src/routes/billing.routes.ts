import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reportLimiter } from "../middleware/rateLimit.js";
import { aggregateBilling } from "../utils/billing.js";
import { loadBillingData } from "../utils/billingQuery.js";

export const billingRouter = Router();
billingRouter.use(requireAuth, requireAdmin, reportLimiter);

const querySchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  objectId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  /** "1" = näita ka juba arveldatud tunde (kontrolliks). */
  includeInvoiced: z.coerce.boolean().optional(),
});

/**
 * Arvelduse eelvaade tellijate kaupa.
 *
 * See on arve mustand enne selle vormistamist: samad read, samad summad.
 * Vaikimisi näidatakse ainult veel arveldamata tunde, sest just neid saab
 * arvele panna — juba arveldatud tunnid tuleb eraldi küsida.
 */
billingRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId, objectId, dateFrom, dateTo, includeInvoiced } = querySchema.parse(req.query);

    const { logs, sources } = await loadBillingData({
      organizationId: req.user!.organizationId,
      clientId,
      objectId,
      dateFrom,
      dateTo,
      includeInvoiced,
    });

    const { clients, totals } = aggregateBilling(logs, sources);
    res.json({ clients, totals });
  })
);
