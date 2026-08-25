import { prisma } from "../prisma.js";
import { env } from "../env.js";

/**
 * Tellimuse loogika: 5 € kuus aktiivse kasutaja (istekoha) kohta.
 *
 * Istekohtade arv loetakse alati `users` tabelist, mitte ei hoita eraldi
 * salvestatuna — nii ei saa arve tegelikust kasutusest lahku minna, kui
 * keegi lisatakse või eemaldatakse.
 */

export const TRIAL_DAYS = 14;

export interface SubscriptionState {
  status: string;
  seats: number;
  pricePerSeat: number;
  monthlyTotal: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  billingMode: string;
  /** Kas ettevõte tohib rakendust praegu kasutada. */
  active: boolean;
  /** Kui palju päevi prooviperioodi lõpuni (null kui pole prooviperiood). */
  trialDaysLeft: number | null;
}

/** Aktiivsed kasutajad = istekohad. Ootel/tagasi lükatud ei loe. */
export async function countSeats(organizationId: number): Promise<number> {
  return prisma.user.count({ where: { organizationId, status: "active" } });
}

/** Loob tellimuse prooviperioodiga, kui seda veel pole. */
export async function ensureSubscription(organizationId: number) {
  const existing = await prisma.subscription.findUnique({ where: { organizationId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      organizationId,
      status: "trialing",
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000),
    },
  });
}

export async function getSubscriptionState(organizationId: number): Promise<SubscriptionState> {
  const subscription = await ensureSubscription(organizationId);
  const seats = await countSeats(organizationId);
  const now = new Date();

  const trialActive = subscription.status === "trialing" && (subscription.trialEndsAt?.getTime() ?? 0) > now.getTime();
  // "past_due" jääb teadlikult aktiivseks: makse ebaõnnestumine ei tohi
  // kohe tööaja registreerimist katkestada — töötajad ei saa selle eest
  // midagi parata ja kaotatud tunnid on hullem kui hilinenud makse.
  const active = trialActive || subscription.status === "active" || subscription.status === "past_due";

  return {
    status: subscription.status,
    seats,
    pricePerSeat: env.pricePerSeatEur,
    monthlyTotal: Math.round(seats * env.pricePerSeatEur * 100) / 100,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    billingMode: subscription.billingMode,
    active,
    trialDaysLeft: trialActive
      ? Math.ceil(((subscription.trialEndsAt as Date).getTime() - now.getTime()) / (24 * 3600 * 1000))
      : null,
  };
}
