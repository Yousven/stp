import { App } from "@capacitor/app";
import { useEffect, useState } from "react";

/**
 * Tööpäeva algusest kulunud minutid.
 *
 * Arvutus käib ainult telefoni enda kellast (`Date.now()`) ja tööpäeva
 * algusajast — võrguga sellel mingit seost ei ole. Sellest hoolimata võis
 * näit varem paista kinni jäänuna: kui äpp läheb taustale (näiteks selleks,
 * et Control Centeris lennurežiim sisse lülitada), peatab iOS WebView's
 * JS-taimerid. Tagasi tulles jätkus vana intervall alles järgmisel
 * tiksul, mis 30-sekundilise sammu juures tähendas kuni pooleminutilist
 * seisakut ja veel kuni minuti allapoole ümardamist.
 *
 * Seetõttu ei toetu see hook ainult taimerile: aeg arvutatakse uuesti ka
 * iga kord, kui äpp esiplaanile naaseb või leht uuesti nähtavaks muutub.
 * Taustal taimerit ei hoita — seal ei ole midagi näidata ja tiksumine
 * kulutaks akut.
 */
export function useElapsedMinutes(startTime: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return;

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
  }, [startTime]);

  if (!startTime) return null;

  const started = new Date(startTime).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(Math.floor((now - started) / 60_000), 0);
}
