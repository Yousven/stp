import { checkGeofence, type GeofenceTarget } from "./geofence.js";

/**
 * Kohaloleku sündmuse vastuvõtu reegel.
 *
 * ASÜMMEETRIA ON SIHILIK ja see on kogu petmisvastase ahela tuum:
 *
 *   EXIT  peatab kella ehk saab tunde ainult VÄHENDADA. Võtame vastu ilma
 *         asukohakontrollita — vale EXIT teeb liiga töötajale, mitte
 *         ettevõttele, ja kella peatumine peab töötama ka halva GPS-iga.
 *
 *   ENTER paneb peatatud kella uuesti käima ehk LISAB tunde. Seda tuleb
 *         tõendada täpselt samamoodi nagu tööpäeva alustamist.
 *
 * Ilma selleta kehtis serveripoolne asukohakontroll ainult tööpäeva
 * ALUSTAMISEL: objektilt lahkunud töötaja sai kella uuesti käima panna
 * ükskõik kust, saates ühe ENTER-sündmuse.
 */
export type PresenceEventType = "ENTER" | "EXIT";

export interface PresenceEventInput {
  type: PresenceEventType;
  occurredAt: Date;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface PresenceContext {
  logStart: Date;
  /** `null` = tööpäev on veel lahti. */
  logEnd: Date | null;
  object: GeofenceTarget;
  now: Date;
  /** Kellanihke tolerants tuleviku suunas. */
  futureToleranceMs: number;
}

export type PresenceRejectReason =
  /** Ajatempel on tuleviku suunas üle tolerantsi. */
  | "future"
  /** Väljaspool tööpäeva akent — tundide arvutus ignoreerib niikuinii. */
  | "outside-window"
  /** Lõpetatud tööpäeva ei panda uuesti käima. */
  | "log-closed"
  /** ENTER ilma koordinaatideta ei ole tõendatav. */
  | "no-location"
  /** ENTER väljaspool objekti geofence'i. */
  | "too-far";

export type PresenceDecision =
  | { accept: true }
  | { accept: false; reason: PresenceRejectReason };

export function decidePresenceEvent(
  event: PresenceEventInput,
  ctx: PresenceContext
): PresenceDecision {
  const at = event.occurredAt.getTime();
  const futureLimit = ctx.now.getTime() + ctx.futureToleranceMs;

  if (at > futureLimit) return { accept: false, reason: "future" };

  // Lõpetatud päeva aken on kinni; lahtisel päeval on ülempiir "praegu"
  // koos sama kellanihke tolerantsiga.
  const windowEnd = ctx.logEnd ? ctx.logEnd.getTime() : futureLimit;
  if (at < ctx.logStart.getTime() || at > windowEnd) {
    return { accept: false, reason: "outside-window" };
  }

  if (event.type === "EXIT") return { accept: true };

  // Siit edasi ainult ENTER.
  if (ctx.logEnd) return { accept: false, reason: "log-closed" };
  if (event.latitude == null || event.longitude == null) {
    return { accept: false, reason: "no-location" };
  }

  const fence = checkGeofence(ctx.object, {
    latitude: event.latitude,
    longitude: event.longitude,
    accuracy: event.accuracy,
  });
  return fence.inside ? { accept: true } : { accept: false, reason: "too-far" };
}
