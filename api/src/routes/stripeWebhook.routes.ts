import express, { Router } from "express";
import { handleWebhookEvent } from "../billing/stripe.js";
import { isStripeConfigured } from "../env.js";
import { captureError } from "../observability.js";

export const stripeWebhookRouter = Router();

/**
 * Stripe'i webhook.
 *
 * NB! Peab saama TÖÖTLEMATA keha (`express.raw`), kuna allkirja kontroll
 * arvutatakse baitide, mitte parsitud JSON-i pealt. Seetõttu on see eraldi
 * router, mis mounditakse ENNE `express.json()` middleware'i.
 *
 * Autentimist siin ei ole ega tohi olla — Stripe ei oska meie JWT-d saata.
 * Turvalisuse tagab ainult allkirja kontroll.
 */
stripeWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: "Stripe pole seadistatud." });
      return;
    }

    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).json({ error: "Allkiri puudub." });
      return;
    }

    try {
      await handleWebhookEvent(req.body as Buffer, signature);
      // Vasta kiiresti 200-ga: Stripe kordab saatmist, kui vastus viibib,
      // ja sama sündmuse korduv töötlemine tekitaks segadust.
      res.json({ received: true });
    } catch (err) {
      // Vigane allkiri on ainus juhtum, kus tahame 400 — muidu prooviks
      // Stripe lõputult uuesti.
      const message = err instanceof Error ? err.message : "tundmatu viga";
      if (message.includes("signature")) {
        res.status(400).json({ error: "Allkirja kontroll ebaõnnestus." });
        return;
      }
      captureError(err, { source: "stripe-webhook" });
      res.status(500).json({ error: "Webhook'i töötlemine ebaõnnestus." });
    }
  }
);
