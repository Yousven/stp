import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getSubscriptionState } from "../billing/subscription.js";
import { createCheckoutSession, createPortalSession } from "../billing/stripe.js";
import { isStripeConfigured } from "../env.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth, requireAdmin);

/** Tellimuse olek + istekohtade arv ja kuutasu. */
subscriptionRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const state = await getSubscriptionState(req.user!.organizationId);
    res.json({ ...state, stripeAvailable: isStripeConfigured() });
  })
);

/** Alustab Stripe Checkout voogu; tagastab URL-i, kuhu admin suunata. */
subscriptionRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      throw new HttpError(503, req.m.billing.notConfiguredContact);
    }

    const admin = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.sub },
      select: { email: true },
    });
    const url = await createCheckoutSession(req.user!.organizationId, admin.email);
    res.json({ url });
  })
);

/** Kliendiportaal: kaardi vahetamine, arved, tühistamine. */
subscriptionRouter.post(
  "/portal",
  asyncHandler(async (req, res) => {
    if (!isStripeConfigured()) throw new HttpError(503, req.m.billing.notConfigured);
    const url = await createPortalSession(req.user!.organizationId);
    res.json({ url });
  })
);
