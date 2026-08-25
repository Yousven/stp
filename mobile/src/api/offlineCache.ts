import { Preferences } from "@capacitor/preferences";

const CACHE_KEY = "stp_active_log";

/**
 * Viimati teadaolev aktiivne tööpäev, salvestatuna telefoni.
 *
 * Ilma selleta ei saa töötaja levita objektil tööpäeva lõpetada: lõpetamise
 * vorm küsib logi ID-d serverist, mida offline alustatud tööpäeval veel
 * olemaski ei ole. Seetõttu on siin kaks võimalikku viidet:
 *
 *  - `logId` — server on tööpäeva juba loonud (alustati levis),
 *  - `pendingActionId` — alustamine on ikka veel järjekorras ja server
 *    annab ID alles siis, kui see kohale jõuab.
 */
export interface CachedActiveLog {
  logId?: number;
  pendingActionId?: string;
  objectName: string;
  startTime: string;
}

export async function readActiveLog(): Promise<CachedActiveLog | null> {
  const { value } = await Preferences.get({ key: CACHE_KEY });
  if (!value) return null;
  try {
    return JSON.parse(value) as CachedActiveLog;
  } catch {
    return null;
  }
}

export async function writeActiveLog(log: CachedActiveLog): Promise<void> {
  await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(log) });
}

export async function clearActiveLog(): Promise<void> {
  await Preferences.remove({ key: CACHE_KEY });
}

const OBJECTS_KEY = "stp_objects";

/**
 * Objektide nimekiri telefoni salvestatuna.
 *
 * Alustamise vorm ei saaks levita üldse avaneda, kui objektide loend tuleks
 * alati serverist. Nimekiri muutub harva, seega viimane teadaolev versioon on
 * piisavalt hea — ja server kontrollib alustamisel niikuinii, kas objekt
 * kuulub ettevõttele ja kas töötaja on selle raadiuses.
 */
export async function readCachedObjects<T>(): Promise<T[] | null> {
  const { value } = await Preferences.get({ key: OBJECTS_KEY });
  if (!value) return null;
  try {
    return JSON.parse(value) as T[];
  } catch {
    return null;
  }
}

export async function writeCachedObjects(objects: unknown[]): Promise<void> {
  await Preferences.set({ key: OBJECTS_KEY, value: JSON.stringify(objects) });
}
