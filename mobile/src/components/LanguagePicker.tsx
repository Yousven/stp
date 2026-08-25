import { LANGUAGES, useI18n, type Language } from "../i18n";

/**
 * Keelevalik. Keelte nimed on alati oma keeles kirjas ("Русский", mitte
 * "Vene keel") — nii leiab õige valiku ka see, kes praegust keelt ei loe.
 */
export function LanguagePicker() {
  const { d, lang, setLang } = useI18n();

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
