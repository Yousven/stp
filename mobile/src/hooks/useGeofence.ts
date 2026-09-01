import { App } from "@capacitor/app";
import { acquirePosition } from "../api/location";
import { useEffect, useRef } from "react";
import { apiRequest } from "../api/client";
import type { PresenceEventsResponse, TimeLog } from "../api/types";

const EARTH_RADIUS_METERS = 6371000;

// GPS-i ebatäpsuse varu, sama loogika mis serveris (timeLogs.routes.ts):
// telefoni teatatud täpsus lisatakse raadiusele, et objekti servas seistes
// ei hakkaks kohalolek edasi-tagasi võbelema.
const MAX_ACCURACY_ALLOWANCE_METERS = 100;

// Kui äpp on lahti, kontrolli aeg-ajalt üle. Taustal teeb seda OS-i
// geofencing, aga lahtise äpi puhul ei saa sellele lootma jääda: kui
// töötaja objektilt lahkub ja äpp on taskus lahti, peab kell peatuma ka
// siis, kui OS-i sündmus hilineb.
const RECHECK_INTERVAL_MS = 60_000;

// Port originaalse dashboard.php brauseri-JS Haversine valemist.
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export interface PresenceStatus {
  inside: boolean;
  distanceMeters: number;
}

/**
 * Esiplaani kohaloleku kontroll: kui Dashboard on lahti, kontrollib kus
 * töötaja on, ja saadab ENTER/EXIT sündmuse, kui olek on muutunud.
 *
 * Võrdlusalus tuleb SERVERILT (`activeLog.presence.onSite`), mitte kohalikust
 * mälust. Varem hoiti eelmist olekut `useRef(null)`-is ja sündmus saadeti
 * ainult siis, kui eelmine väärtus polnud null — aga effect käivitus ainult
 * korra tööpäeva kohta ja ref lähtestus iga uue mount'iga, seega tingimus ei
 * täitunud praktiliselt kunagi ja EXIT jäi saatmata. Töötaja võis olla
 * kümneid kilomeetreid eemal, ilma et server oleks sellest teada saanud.
 *
 * Tööpäeva EI lõpetata automaatselt — lahkumisel kell lihtsalt peatub
 * (väljas viibitud aeg ei lähe tundide sisse) ja naasmisel jookseb edasi.
 * Nii ei pea töötaja iga poeskäigu järel uuesti sisse registreerima.
 *
 * Taustal (kui äpp on kinni) töötav jälgimine tuleb natiivse pluginaga —
 * see hook katab ajad, mil äpp on avatud.
 *
 * `onEventSent` kutsutakse ainult siis, kui sündmus päriselt serverisse
 * läks: sellest tuleb dashboard uuesti laadida, et `presence.onSite`
 * värskeneks. Ilma selleta jääks võrdlusalus vanaks ja sama EXIT saadetaks
 * iga kontrolliga uuesti.
 */
export function useGeofence(
  activeLog: TimeLog | null,
  onPresenceChange: (status: PresenceStatus) => void,
  onEventSent?: () => void
) {
  const onChangeRef = useRef(onPresenceChange);
  onChangeRef.current = onPresenceChange;
  const onSentRef = useRef(onEventSent);
  onSentRef.current = onEventSent;

  const logId = activeLog?.id ?? null;
  const objectLat = activeLog?.object.latitude ?? null;
  const objectLon = activeLog?.object.longitude ?? null;
  const objectRadius = activeLog?.object.radius ?? null;
  // Sündmusteta tööpäev tähendab kohalolekut — sama eeldus mis serveris.
  const serverOnSite = activeLog?.presence?.onSite ?? true;

  useEffect(() => {
    if (logId == null || objectLat == null || objectLon == null || objectRadius == null) return;

    let cancelled = false;
    // Kohalik ülekirjutus serveri olekule: kehtib hetkest, mil sündmus sai
    // saadetud, kuni dashboard on uuesti laetud. Ilma selleta saadaks iga
    // järgmine kontroll sama EXIT-i uuesti, kuni server jõuab vastata.
    let believedOnSite: boolean | null = null;
    let sending = false;

    async function check() {
      try {
        // Jagatud asukohamoodul annab hiljutise mõõtmise ilma uut GPS-i
        // fixi käivitamata. Dashboardi avamine ei tohi iga kord raadiot
        // äratada: seda tehakse päevas kümneid kordi ja just sellest
        // koguneks aku kulu.
        const position = await acquirePosition();
        if (cancelled) return;

        const distance = distanceMeters(
          position.latitude,
          position.longitude,
          Number(objectLat),
          Number(objectLon)
        );
        const allowance = Math.min(position.accuracy ?? 0, MAX_ACCURACY_ALLOWANCE_METERS);
        const inside = distance <= Number(objectRadius) + allowance;

        onChangeRef.current({ inside, distanceMeters: Math.round(distance) });

        // Saada sündmus ainult siis, kui mõõdetud olek erineb sellest, mida
        // server praegu usub.
        if (sending || inside === (believedOnSite ?? serverOnSite)) return;

        sending = true;
        try {
          const result = await apiRequest<PresenceEventsResponse>(
            `/time-logs/${logId}/presence-events`,
            {
              method: "POST",
              body: {
                events: [
                  {
                    type: inside ? "ENTER" : "EXIT",
                    occurredAt: new Date().toISOString(),
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy ?? undefined,
                    source: "foreground",
                  },
                ],
              },
            }
          );

          /*
           * Usume serveri otsust, mitte oma mõõtmist.
           *
           * Server kontrollib ENTER-i asukoha järgi ja võib selle tagasi
           * lükata (liiga kaugel, koordinaadid puuduvad, päev juba
           * lõpetatud). Kui märgiksime siin `believedOnSite = inside`,
           * arvaks äpp end objektile ja LÕPETAKS uuesti proovimise — kell
           * jääks igaveseks seisma. Nii proovib järgmine kontroll uuesti.
           */
          believedOnSite = result.presence?.onSite ?? inside;
          if (!cancelled) onSentRef.current?.();
        } finally {
          sending = false;
        }
      } catch (err) {
        // Võrguviga ei tohi kontrolli lõpetada — järgmine kord proovime uuesti.
        console.error("Geolokatsiooni viga:", err);
      }
    }

    check();

    // Taustalt naasmine on kõige tähtsam kontrollihetk: just siis on
    // töötaja tõenäoliselt mujale liikunud, ilma et äpp oleks vahepeal
    // midagi mõõtnud.
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) check();
    });

    const timer = window.setInterval(check, RECHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      listener.then((l) => l.remove());
    };
  }, [logId, objectLat, objectLon, objectRadius, serverOnSite]);
}
