import Stripe from "stripe";
import { env, isStripeConfigured } from "../env.js";
import { prisma } from "../prisma.js";
import { countSeats, ensureSubscription } from "./subscription.js";

let cached: Stripe | null = null;

function getStripe(): Stripe {
  if (!cached) cached = new Stripe(env.stripe.secretKey);
  return cached;
}

/**
 * Loob Stripe Checkout sessiooni per-seat tellimuse jaoks.
 *
 * Istekohtade arv saadetakse `quantity`-na; Stripe arveldab selle järgi ja
 * me sünkroonime koguse hiljem, kui töötajaid lisandub või lahkub.
 */
export async function createCheckoutSession(organizationId: number, adminEmail: string): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe pole seadistatud (STRIPE_SECRET_KEY, STRIPE_PRICE_ID)");
  }

  const subscription = await ensureSubscription(organizationId);
  const seats = await countSeats(organizationId);
  const stripe = getStripe();

  let customerId = subscription.stripeCustomerId;
  if (!customerId) {
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const customer = await stripe.customers.create({
      email: adminEmail,
      name: organization.name,
      // Seome Stripe'i kliendi meie ettevõttega, et webhook leiaks õige rea
      // ka siis, kui client_reference_id peaks puuduma.
      metadata: { organizationId: String(organizationId), orgSlug: organization.slug },
    });
    customerId = customer.id;
    await prisma.subscription.update({ where: { organizationId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(organizationId),
    line_items: [{ price: env.stripe.priceId, quantity: Math.max(seats, 1) }],
    success_url: `${env.appUrl}/admin/subscription?checkout=success`,
    cancel_url: `${env.appUrl}/admin/subscription?checkout=cancelled`,
    subscription_data: { metadata: { organizationId: String(organizationId) } },
  });

  if (!session.url) throw new Error("Stripe ei tagastanud checkout URL-i");
  return session.url;
}

/** Kliendiportaal: kaardi vahetamine, arvete vaatamine, tühistamine. */
export async function createPortalSession(organizationId: number): Promise<string> {
  if (!isStripeConfigured()) throw new Error("Stripe pole seadistatud");

  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!subscription?.stripeCustomerId) throw new Error("Tellimust pole veel vormistatud");

  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.appUrl}/admin/subscription`,
  });
  return session.url;
}

/**
 * Sünkroonib istekohtade arvu Stripe'iga.
 *
 * Kutsutakse siis, kui kasutajaid lisandub või eemaldatakse. Vaikselt
 * ebaõnnestumine on siin lubatud: kasutaja lisamine ei tohi katkeda
 * sellepärast, et Stripe ei vastanud — kogus korrigeeritakse järgmisel
 * korral või kuutasu arvestamisel.
 */
export async function syncSeatQuantity(organizationId: number): Promise<void> {
  if (!isStripeConfigured()) return;

  try {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
    if (!subscription?.stripeSubscriptionId) return;

    const seats = await countSeats(organizationId);
    const stripe = getStripe();
    const remote = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const item = remote.items.data[0];
    if (!item || item.quantity === seats) return;

    await stripe.subscriptionItems.update(item.id, {
      quantity: seats,
      // Proportsionaalne arvestus: keset kuud lisandunud töötaja eest
      // võetakse ainult järelejäänud päevade eest.
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    console.error("[stripe] Istekohtade sünkroonimine ebaõnnestus:", err);
  }
}

/** Töötleb Stripe'i webhook-sündmuse ja uuendab kohalikku olekut. */
export async function handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();
  // Allkirja kontroll on kohustuslik — ilma selleta saaks igaüks POST-iga
  // endale tasuta tellimuse "aktiveerida".
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = Number(session.client_reference_id);
      if (!organizationId) break;
      await prisma.subscription.update({
        where: { organizationId },
        data: {
          status: "active",
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
        },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const organizationId = Number(sub.metadata?.organizationId);
      if (!organizationId) break;

      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
      await prisma.subscription.update({
        where: { organizationId },
        data: {
          status: event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(sub.status),
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (!customerId) break;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: "past_due" },
      });
      break;
    }

    default:
      // Ülejäänud sündmused ei huvita meid — Stripe saadab neid palju.
      break;
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return status === "trialing" ? "trialing" : "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "past_due";
  }
}
