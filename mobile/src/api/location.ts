import { Geolocation, type Position } from "@capacitor/geolocation";

/**
 * Asukoha hankimine.
 *
 * Probleem, mida see lahendab: GPS-i esimene fix võtab külmalt kümneid
 * sekundeid, eriti objektil, kus levi on kehv ja telefon ei saa A-GPS-i
 * abi. Kui otsing algab alles nupuvajutusest, seisab töötaja ekraani ees
 * ja ootab.
 *
 * Lahendus on otsing ette ära teha: ekraani avamisel käivitatakse otsing
 * taustal ja nupuvajutuse hetkeks on tulemus tavaliselt juba olemas. Ootamine
 * kaob kriitiliselt teelt, ilma et asukohta kontrollitaks vähem rangelt —
 * kontrolli teeb niikuinii server saadetud koordinaatide põhjal.
 */

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  /** Millal see mõõtmine tehti (ms epohhist). */
  timestamp: number;
}

/** Brauseri GeolocationPositionError.code: 1 = luba puudub. */
export const PERMISSION_DENIED = 1;

/**
 * Kui vana fix veel kõlbab.
 *
 * 45 sekundiga jõuab inimene kõndides ~50 m. Objekti raadius on tavaliselt
 * 100–300 m ja server lisab lubatud hälbele veel telefoni enda teatatud
 * täpsuse, seega selle vanune mõõtmine ei muuda otsust "objektil või mitte".
 */
const FRESH_ENOUGH_MS = 45_000;

/** Fix, mille täpsus on sellest halvem, ei ole otsustamiseks piisav. */
const USABLE_ACCURACY_METERS = 200;

let cached: Fix | null = null;
let inFlight: Promise<Fix> | null = null;

function toFix(position: Position): Fix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp ?? Date.now(),
  };
}

function isFresh(fix: Fix | null, maxAgeMs: number): fix is Fix {
  if (!fix) return false;
  if (Date.now() - fix.timestamp > maxAgeMs) return false;
  return fix.accuracy === null || fix.accuracy <= USABLE_ACCURACY_METERS;
}

/**
 * Käivitab otsingu taustal, ilma tulemust ootamata.
 *
 * Kutsutakse ekraani avamisel. Vea korral ei tehta midagi: see on ainult
 * ettevalmistus ja päris veateate annab `acquirePosition` siis, kui
 * asukohta päriselt vaja läheb.
 */
export function warmUpLocation(): void {
  if (isFresh(cached, FRESH_ENOUGH_MS) || inFlight) return;
  inFlight = requestPosition().catch((err) => {
    inFlight = null;
    throw err;
  });
  void inFlight.catch(() => undefined);
}

async function requestPosition(): Promise<Fix> {
  try {
    // maximumAge lubab OS-il anda hiljutise mõõtmise ilma raadiot äratamata.
    // See on ühtlasi kõige suurem kokkuhoid akule: enamik päringuid ei
    // käivita üldse uut GPS-i fixi.
    const position = await Geolocation.getCurrentPosition({
      timeout: 20_000,
      enableHighAccuracy: true,
      maximumAge: FRESH_ENOUGH_MS,
    });
    const fix = toFix(position);
    cached = fix;
    inFlight = null;
    return fix;
  } catch (first) {
    if ((first as { code?: number })?.code === PERMISSION_DENIED) {
      inFlight = null;
      throw first;
    }
    // Teine katse leebemate tingimustega: mastide ja WiFi järgi saadud
    // asukoht on kümneid meetreid ebatäpsem, aga objekti raadiuse jaoks
    // enamasti piisav — ja see tuleb sekunditega, mitte minutiga.
    try {
      const position = await Geolocation.getCurrentPosition({
        timeout: 15_000,
        enableHighAccuracy: false,
        maximumAge: 120_000,
      });
      const fix = toFix(position);
      cached = fix;
      inFlight = null;
      return fix;
    } catch (second) {
      inFlight = null;
      console.warn("Asukoha määramine ebaõnnestus", first, second);
      throw second;
    }
  }
}

/**
 * Annab asukoha: kohe, kui hiljutine mõõtmine on olemas, muidu ootab ära
 * juba käimasoleva või alustab uue otsingu.
 */
export async function acquirePosition(): Promise<Fix> {
  if (isFresh(cached, FRESH_ENOUGH_MS)) return cached;
  if (inFlight) return inFlight;
  inFlight = requestPosition();
  return inFlight;
}

/** Kas kasutamiskõlblik mõõtmine on juba olemas (nupu oleku näitamiseks). */
export function hasFreshFix(): boolean {
  return isFresh(cached, FRESH_ENOUGH_MS);
}

/** Kas otsing käib praegu. */
export function isLocating(): boolean {
  return inFlight !== null;
}

/** Ainult testimiseks ja väljalogimisel: unusta salvestatud asukoht. */
export function forgetLocation(): void {
  cached = null;
  inFlight = null;
}
