import { et, type Messages } from "./et";
import { en } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";

export const LOCALES = ["et", "en", "ru", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

/** Eesti on lähtekeel ja elab juurpolgul, ülejäänud saavad prefiksi. */
export const DEFAULT_LOCALE: Locale = "et";

const messages: Record<Locale, Messages> = { et, en, ru, uk };

export function t(locale: Locale): Messages {
  return messages[locale];
}

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Tee antud keeles. Eesti ei saa prefiksit (`prefixDefaultLocale: false`
 * astro.config.mjs-s), seega seda ei tohi ka siin lisada — muidu tekiks
 * `/et/`, mida ei ole olemas.
 */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  // Lõpukaldkriips on kohustuslik: leht ise elab aadressil `/ru/` ja
  // canonical, mis osutab `/ru`-le, osutaks ümbersuunamisele.
  return `/${locale}${clean === "/" ? "/" : clean}`;
}

/** `<html lang>` jaoks. */
export const HTML_LANG: Record<Locale, string> = {
  et: "et-EE",
  en: "en",
  ru: "ru",
  uk: "uk",
};

export type { Messages };
