/**
 * Sündmuste kiht ilma providerita.
 *
 * Analytics-teenust ei ole veel valitud, aga sündmuste NIMED ja kohad, kus
 * neid saadetakse, on need, mis hiljem koodi muutmist nõuaksid. Seetõttu on
 * kiht olemas juba praegu ja provider käib hiljem selle taha.
 *
 * Kuidas provider ühendatakse: keegi (Plausible'i, Cloudflare Web
 * Analyticsi või GA4 skript) seab `window.stpAnalytics.push` funktsiooni.
 * Kuni seda ei ole, kogutakse sündmused väikesesse järjekorda, mille
 * hilisem adapter saab tühjendada. Ilma providerita ei tohi leht anda
 * ühtegi viga ega teha ühtegi võrgupäringut.
 *
 * PII-d siia EI panda: ei e-posti, ei nime, ei IP-d, ei vabateksti
 * kasutajalt. Ainult sündmuse nimi ja loetud arv fikseeritud välju.
 */

export type EventName =
  | "cta_click"
  | "pricing_view"
  | "faq_open"
  | "language_change"
  | "scroll_50"
  | "scroll_90";

/** Lubatud väärtused on tahtlikult kitsad — vabateksti siia ei satu. */
export type EventProps = Record<string, string | number | boolean>;

export interface TrackedEvent {
  name: EventName;
  props: EventProps;
  /** Millisekundid lehe avamisest, mitte kellaaeg — ajatempel on juba providereil. */
  at: number;
}

interface AnalyticsBridge {
  queue: TrackedEvent[];
  push?: (event: TrackedEvent) => void;
}

declare global {
  interface Window {
    stpAnalytics?: AnalyticsBridge;
  }
}

/** Järjekorra ülempiir: ilma providerita ei kogu me mälu täis. */
const MAX_QUEUE = 50;

function bridge(): AnalyticsBridge {
  if (!window.stpAnalytics) window.stpAnalytics = { queue: [] };
  return window.stpAnalytics;
}

/**
 * Saada sündmus. Ei viska kunagi erindit — katkine analytics ei tohi
 * turunduslehte maha võtta.
 */
export function track(name: EventName, props: EventProps = {}): void {
  try {
    const event: TrackedEvent = { name, props, at: Math.round(performance.now()) };
    const target = bridge();

    if (typeof target.push === "function") {
      target.push(event);
      return;
    }
    if (target.queue.length < MAX_QUEUE) target.queue.push(event);
  } catch {
    /* Analytics ei ole kunagi põhjus, miks leht katki läheb. */
  }
}

/** Ühekordsed sündmused (`pricing_view`, `scroll_50`) ei kordu. */
const fired = new Set<string>();

export function trackOnce(name: EventName, props: EventProps = {}): void {
  if (fired.has(name)) return;
  fired.add(name);
  track(name, props);
}
