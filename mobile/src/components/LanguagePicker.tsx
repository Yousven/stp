import { LANGUAGES, useI18n, type Language } from "../i18n";

/**
 * Keelevalik. Keelte nimed on alati oma keeles kirjas ("Русский", mitte
 * "Vene keel") — nii leiab õige valiku ka see, kes praegust keelt ei loe.
 */
export function LanguagePicker({ variant = "select" }: { variant?: "select" | "chips" }) {
  const { d, lang, setLang } = useI18n();

  /**
   * Sisselogimise ekraanil on keeled nuppudena, mitte rippmenüüs. Inimene,
   * kes eesti keelt ei loe, ei tea rippmenüüd avada — nähtav "Русский"
   * nupp on ainus asi, millest ta kohe aru saab.
   */
  if (variant === "chips") {
    return (
      <div className="lang-chips" role="group" aria-label={d.language.label}>
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            className={`chip ${lang === code ? "chip--active" : ""}`}
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
          >
            {d.language[code]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label>
      {d.language.label}
      <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {d.language[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
