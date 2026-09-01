import { Preferences } from "@capacitor/preferences";

/**
 * Selle paigalduse püsiv id.
 *
 * MIS SEE ON: juhuslik id, mis tekib esimesel käivitusel ja jääb seadmesse
 * kuni äpi eemaldamiseni. Server salvestab selle tööpäeva alustamisel ja
 * iga kohaloleku sündmusega. Kui ühe tööpäeva sündmused hakkavad tulema
 * teisest seadmest, tekib märge nii töötajale kui haldurile.
 *
 * MIS SEE EI OLE: autentimisvahend. Klient saadab selle ise, seega teda
 * saab võltsida. Väärtus on mustri nähtavaks tegemises — keegi teine, kes
 * logib sama kontoga oma telefonis sisse, jätab jälje, kui ta just
 * spetsiaalselt id-d ei kopeeri.
 *
 * Seadme enda identifikaatorit (IDFV, ANDROID_ID) EI kasutata: neid ei saa
 * veebiliideses ja nad on privaatsuse mõttes tundlikumad kui juhuslik id,
 * mis ei ütle seadme kohta midagi.
 */
const KEY = "stp_device_id";

let cached: string | null = null;

function randomId(): string {
  // `crypto.randomUUID` on olemas nii WebView-s kui brauseris; vanema
  // WebView jaoks on varuvariant juhuslikest baitidest.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const { value } = await Preferences.get({ key: KEY });
  if (value) {
    cached = value;
    return value;
  }

  const created = randomId();
  await Preferences.set({ key: KEY, value: created });
  cached = created;
  return created;
}
