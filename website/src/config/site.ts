/**
 * Kõik, mis võib muutuda ilma kujundust puutumata.
 *
 * Komponendid loevad SIIT, mitte ei hardcode'i väärtusi. CTA sihtkoht
 * eelkõige: turundusleht ei ehita oma registreerumisvoogu, vaid viitab
 * olemasolevasse lahendusse, ja see aadress muutub tõenäoliselt enne kui
 * leht valmis saab.
 */

/** Vaikimisi CTA sihtkoht, kui `PUBLIC_CTA_URL` on seadmata. */
const FALLBACK_CTA_URL = "https://api.nutisemud.ee/register";

const ctaUrlRaw = import.meta.env.PUBLIC_CTA_URL ?? FALLBACK_CTA_URL;

/**
 * CTA aadressi kontroll.
 *
 * Katkist linki ei renderdata vaikides: kui `PUBLIC_CTA_URL` on seatud,
 * aga vigane, kukub build siin läbi. Parem katkine build kui avaldatud
 * leht, mille ainus nupp ei vii kuhugi.
 */
function validateCtaUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `PUBLIC_CTA_URL ei ole korrektne absoluutne aadress: ${JSON.stringify(value)}`,
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`PUBLIC_CTA_URL peab olema http(s): ${value}`);
  }
  if (import.meta.env.PROD && parsed.protocol !== "https:") {
    throw new Error(`PUBLIC_CTA_URL peab production'is olema https: ${value}`);
  }
  return parsed.href;
}

export const site = {
  domain: "stp.nutisemud.ee",
  url: "https://stp.nutisemud.ee",

  /**
   * Registreerumine käib OLEMASOLEVAS veebiliideses. Siia ei tule uut
   * hosti ega uut voogu — vt CLAUDE.md.
   *
   * Ülekirjutatav `PUBLIC_CTA_URL` keskkonnamuutujaga (Cloudflare Pages
   * build settings), et aadressi muutmiseks ei peaks koodi puutuma.
   */
  ctaUrl: validateCtaUrl(ctaUrlRaw),

  /** Faktid koodist. Vt CLAUDE.md "Faktid, mida veeb väidab". */
  pricing: {
    /** api/src/env.ts → PRICE_PER_SEAT_EUR (vaikeväärtus 5) */
    pricePerSeatEur: 5,
    /** api/src/billing/subscription.ts → TRIAL_DAYS */
    trialDays: 14,
    currency: "EUR",
  },

  /**
   * Toode ja ettevõte on kaks ERI asja ja seda ei tohi lehel segamini ajada.
   *
   *   `product`   — see, mida müüakse ja mis on lehel bränd.
   *   `short`     — lühend. Ainult tehnilises kontekstis ja domeenis
   *                 (`stp.nutisemud.ee`), mitte turunduskoopias.
   *   `legalName` — juriidiline isik toote taga. Esineb AINULT
   *                 autoriõiguse real, juriidilistel lehtedel ja
   *                 structured data `provider` väljal.
   *
   * Toodet ei nimetata kunagi "Nutisemudeks".
   */
  vendor: {
    product: "SmartTimePlanning",
    short: "STP",
    legalName: "Nutisemud OÜ",
  },

  /**
   * Juriidilised rekvisiidid.
   *
   * `null` tähendab: EI OLE TEADA. Neid ei tohi välja mõelda — registrikood,
   * KMKR, aadress, telefon ja e-post peavad tulema ettevõttelt endalt.
   * Komponendid kontrollivad `null`-i ja jätavad rea lihtsalt välja.
   *
   * Vt LAUNCH.md — need on avaldamise blokeerijad.
   */
  legal: {
    registryCode: null as string | null,
    vatNumber: null as string | null,
    address: null as string | null,
    email: null as string | null,
    phone: null as string | null,
  },

  /** Demo-objekti näitandmed HUD-detailides (api/prisma/seed.ts). */
  demoSite: { name: "Riia 24", lat: 58.3742, lon: 26.718, radiusM: 120 },
} as const;

/** Kas juriidilised rekvisiidid on olemas — juhib "kontakt" lehe sisu. */
export const hasLegalDetails = Object.values(site.legal).some((v) => v !== null);
