import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";
import { setApiLanguage } from "../api/client";
import { et, type Dictionary } from "./et";
import { en } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";

export const LANGUAGES = ["et", "en", "ru", "uk"] as const;
export type Language = (typeof LANGUAGES)[number];

const DICTIONARIES: Record<Language, Dictionary> = { et, en, ru, uk };

/**
 * Kuupäeva- ja kellaajavorming. Eraldi sõnastikust, kuna see ei ole tõlge
 * vaid piirkonnaseade: inglise keeles ootab Eestis viibiv kasutaja ikkagi
 * päev-kuu järjestust, mitte USA oma.
 */
const LOCALES: Record<Language, string> = { et: "et-EE", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };

const LANGUAGE_KEY = "stp_language";

function isLanguage(value: string | null): value is Language {
  return value !== null && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Seadme keel, kui see on üks toetatutest.
 *
 * Ehitusobjektil on esimene kokkupuude äpiga sisselogimisekraan — kui see
 * on kohe töötaja emakeeles, ei pea keegi talle keelevalikut näitama.
 * Vaikimisi jääb eesti keel, kuna toode on Eesti turule.
 */
function detectLanguage(): Language {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return "et";
}

interface I18nValue {
  /** Aktiivse keele sõnastik. Kasutus: `d.dashboard.startWork`. */
  d: Dictionary;
  lang: Language;
  /** BCP 47 silt kuupäevade ja arvude vormindamiseks. */
  locale: string;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Alustame seadme keelest, et esimene renderdus ei vilguks eesti keeles.
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    Preferences.get({ key: LANGUAGE_KEY }).then(({ value }) => {
      if (isLanguage(value)) setLangState(value);
    });
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    void Preferences.set({ key: LANGUAGE_KEY, value: next });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // Server vajab sama keelt, et veateated jõuaksid kasutajani loetavana.
    setApiLanguage(lang);
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ d: DICTIONARIES[lang], lang, locale: LOCALES[lang], setLang }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n peab olema I18nProvideri sees.");
  return ctx;
}

/** Lühend kõige tavalisemaks kasutuseks: `const d = useT();`. */
export function useT(): Dictionary {
  return useI18n().d;
}

/** Kuupäevade vormindamiseks: `new Date(x).toLocaleString(useLocale())`. */
export function useLocale(): string {
  return useI18n().locale;
}
