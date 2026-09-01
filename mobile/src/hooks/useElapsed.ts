import { App } from "@capacitor/app";
import { useEffect, useState } from "react";
import type { PresenceState } from "../api/types";

/**
 * Serveriga sama piir: lahtine tööpäev ei kogu tunde lõputult.
 *
 * Vt `api/src/utils/timeStats.ts` (MAX_OPEN_LOG_HOURS). Kui seda siin ei
 * oleks, näitaks telefon unustatud tööpäeva puhul kasvavat kella, samal ajal
 * kui server on arvestuse ammu peatanud — kaks numbrit, mis räägivad vastu.
 */
const MAX_OPEN_LOG_MINUTES = 12 * 60;

/**
 * Praegune aeg, mis tiksub ainult siis, kui on midagi näidata.
 *
 * Arvutus käib telefoni enda kellast (`Date.now()`) — võrguga sellel mingit
 * seost ei ole. Sellest hoolimata võis näit varem paista kinni jäänuna: kui
 * äpp läheb taustale (näiteks selleks, et Control Centeris lennurežiim sisse
 * lülitada), peatab iOS WebView's JS-taimerid. Tagasi tulles jätkus vana
 * intervall alles järgmisel tiksul.
 *
 * Seetõttu ei toetuta ainult taimerile: aeg arvutatakse uuesti ka iga kord,
 * kui äpp esiplaanile naaseb või leht uuesti nähtavaks muutub. Taustal
 * taimerit ei hoita — seal ei ole midagi näidata ja tiksumine kulutaks akut.
 */
function useNow(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    function sync() {
      setNow(Date.now());
    }

    function startTicking() {
      sync();
      if (timer !== undefined) clearInterval(timer);
      // Sekundiline samm hoiab näidu minuti täpsusega õigena. Kulu on üks
      // olekumuudatus sekundis ja ainult siis, kui ekraan on lahti.
      timer = setInterval(sync, 1000);
    }

    function stopTicking() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    }

    // Taimer käivitatakse alati, ka siis, kui leht raporteerib end
    // peidetuna. Vastupidine valik ("käivita ainult siis, kui oleme
    // nähtavad") tundub säästlikum, aga kui WebView raporteerib käivitamise
    // hetkel ekslikult "hidden" — mida osa iOS-i olukordi teeb — jääks kell
    // seisma ega hakkaks enam kunagi käima, sest ühtegi nähtavuse muutust
    // enam ei tule. Ekraanil seisev kell on halvem viga kui sekundiline
    // taimer, mis paar hetke asjata tiksub; taustale minekul peatab selle
    // esimene sündmus niikuinii.
    startTicking();

    function handleVisibility() {
      if (document.visibilityState === "visible") startTicking();
      else stopTicking();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    // Capacitor annab natiivsel platvormil usaldusväärsema signaali kui
    // visibilitychange, mida iOS ei saada igal taustale minekul.
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) startTicking();
      else stopTicking();
    });

    return () => {
      stopTicking();
      document.removeEventListener("visibilitychange", handleVisibility);
      listener.then((l) => l.remove()).catch(() => undefined);
    };
  }, [enabled]);

  return now;
}

/**
 * Tööpäeva algusest kulunud minutid, kohalolekust sõltumata.
 *
 * Kasutada ainult seal, kus kohalolekut ei ole teada — näiteks ühenduseta
 * vaates, kus telefonis on ainult vahemällu kirjutatud algusaeg. Mujal
 * kasuta `usePresentMinutes`-i, mis peatub koos kohalolekuga.
 */
export function useElapsedMinutes(startTime: string | null | undefined): number | null {
  const now = useNow(Boolean(startTime));

  if (!startTime) return null;
  const started = new Date(startTime).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(Math.floor((now - started) / 60_000), 0);
}

/**
 * Objektil viibitud minutid — kell, mis peatub koos kohalolekuga.
 *
 * Objektilt lahkumine peatab kella, ei lõpeta tööpäeva. Varem luges ekraanil
 * olev kell tööpäeva algusest edasi ka siis, kui kaart oli juba punane ja
 * tunde tegelikult juurde ei tulnud — ekraan rääkis palgaarvestusele vastu.
 *
 * Alus tuleb serverilt (`presentMsBefore` + `since`), mitte telefoni omast
 * arvestusest: kohalolekuintervalle teab ainult server ja kaks eraldi
 * arvestust läheksid paratamatult lahku.
 */
export function usePresentMinutes(
  presence: PresenceState | null | undefined,
  /**
   * Telefoni enda esiplaani kontroll ütleb, et töötaja on praegu eemal.
   *
   * Server saab sellest teada alles siis, kui EXIT kohale jõuab — levita
   * võib see võtta tunde. Kell peab peatuma kohe, kui äpp ise teab, et
   * objektilt on lahkutud; vastasel juhul näitaks punane kaart ja jooksev
   * kell korraga kahte vastandlikku asja.
   */
  offSiteNow = false
): number | null {
  // Eemal olles taimerit ei käivitata. Sellest tuleb ühtlasi peatumine:
  // `now` jääb viimase tiksu peale seisma, seega ka arvutatud tulemus.
  //
  // Piiri täis saanud tööpäeva puhul samuti mitte: number on juba lukus ja
  // tiksuv taimer teeks sekundis ühe olekumuudatuse, mis ei muuda ekraanil
  // mitte midagi. Unustatud tööpäev võib lahti olla tunde.
  const ticking = presence?.onSite === true && !offSiteNow && !isClamped(presence);
  const now = useNow(ticking);

  if (!presence) return null;

  const before = Number(presence.presentMsBefore ?? 0);
  if (!presence.onSite) return clampMinutes(before / 60_000);

  const since = new Date(presence.since).getTime();
  if (Number.isNaN(since)) return clampMinutes(before / 60_000);

  return clampMinutes((before + (now - since)) / 60_000);
}

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(Math.floor(minutes), 0), MAX_OPEN_LOG_MINUTES);
}

/** Kas näit on juba ülempiiril ega saa enam muutuda. */
function isClamped(presence: PresenceState): boolean {
  const since = new Date(presence.since).getTime();
  if (Number.isNaN(since)) return false;
  const live = Number(presence.presentMsBefore ?? 0) + (Date.now() - since);
  return live / 60_000 >= MAX_OPEN_LOG_MINUTES;
}
