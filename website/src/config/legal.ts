/**
 * Juriidilised lehed.
 *
 * Sisu ei ole veel kinnitatud — vt `pages/legal/LegalPage.astro`. Lehed on
 * olemas selleks, et jaluse lingid ei viiks 404-le, ja nad ütlevad ise
 * selgelt välja, et tekst on kinnitamata. Väljamõeldud tingimusi siin ei
 * avaldata.
 *
 * Teed on kõigis keeltes samad (ingliskeelsed nimed), sest lokaliseeritud
 * teed teeksid `hreflang`-i ja `sitemap`-i tarbetult keeruliseks.
 */
import type { Messages } from "../i18n";

export interface LegalPage {
  slug: "privacy" | "terms" | "contact";
  /** Tee ilma keeleprefiksita. */
  path: string;
  /** Võti `footer`-plokis — link jaluses. */
  labelKey: keyof Messages["footer"];
  /** Võti `legal`-plokis — lehe pealkiri. */
  titleKey: keyof Messages["legal"];
}

export const LEGAL_PAGES: readonly LegalPage[] = [
  { slug: "privacy", path: "/privacy/", labelKey: "privacy", titleKey: "privacyTitle" },
  { slug: "terms", path: "/terms/", labelKey: "terms", titleKey: "termsTitle" },
  { slug: "contact", path: "/contact/", labelKey: "contact", titleKey: "contactTitle" },
];
