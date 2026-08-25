import * as Sentry from "@sentry/node";
import { env } from "./env.js";

/**
 * Vigade jälgimine.
 *
 * Ilma selleta ei tea toodangus keegi, kui API viskab — kasutaja näeb
 * "Serveri viga" ja asi jääbki sinnapaika. DSN puudumisel on kõik kutsed
 * no-op'id, seega arenduses ja ilma kontota töötab rakendus tavapäraselt.
 *
 * NB! Peab olema imporditud enne ülejäänud rakendust (vt server.ts), et
 * Sentry jõuaks instrumentatsiooni paigaldada.
 */
export function initObservability(): void {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    // Jälgi jõudlust tagasihoidlikult — vaikimisi 10% päringutest, et
    // väikese serveri kvoot ei täituks.
    tracesSampleRate: env.sentryTracesSampleRate,
    // Ära saada isikuandmeid (IP, päised) vaikimisi — tegemist on
    // töötajate asukoha- ja palgaandmetega.
    sendDefaultPii: false,
    beforeSend(event) {
      // Eemalda võimalikud saladused enne saatmist.
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      if (event.request?.query_string) {
        // Raportilingid kannavad tokenit query-parameetris.
        event.request.query_string = String(event.request.query_string).replace(/token=[^&]+/g, "token=[eemaldatud]");
      }
      return event;
    },
  });
}

export function isObservabilityEnabled(): boolean {
  return Boolean(env.sentryDsn);
}

/** Saadab vea Sentry'sse (kui seadistatud) ja logib alati konsooli. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  console.error(err);
  if (!env.sentryDsn) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext("lisainfo", context);
    Sentry.captureException(err);
  });
}

export { Sentry };
