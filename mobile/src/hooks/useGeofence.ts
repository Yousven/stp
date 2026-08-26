import { acquirePosition } from "../api/location";
import { useEffect, useRef } from "react";
import { apiRequest } from "../api/client";
import type { TimeLog } from "../api/types";

const EARTH_RADIUS_METERS = 6371000;

// GPS-i ebatäpsuse varu, sama loogika mis serveris (timeLogs.routes.ts):
// telefoni teatatud täpsus lisatakse raadiusele, et objekti servas seistes
// ei hakkaks kohalolek edasi-tagasi võbelema.
const MAX_ACCURACY_ALLOWANCE_METERS = 100;

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
 * Tööpäeva EI lõpetata enam automaatselt — lahkumisel kell lihtsalt peatub
 * (väljas viibitud aeg ei lähe tundide sisse) ja naasmisel jookseb edasi.
 * Nii ei pea töötaja iga poeskäigu järel uuesti sisse registreerima.
 *
 * Taustal (kui äpp on kinni) töötav jälgimine tuleb natiivse pluginaga —
 * seni katab see hook ainult ajad, mil äpp on avatud.
 */
export function useGeofence(activeLog: TimeLog | null, onPresenceChange: (status: PresenceStatus) => void) {
  const lastInsideRef = useRef<boolean | null>(null);
  const onChangeRef = useRef(onPresenceChange);
  onChangeRef.current = onPresenceChange;

  useEffect(() => {
    if (!activeLog) {
      lastInsideRef.current = null;
      return;
    }
    const { latitude, longitude, radius } = activeLog.object;
    if (latitude == null || longitude == null || radius == null) return;

    let cancelled = false;

    (async () => {
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
          Number(latitude),
          Number(longitude)
        );
        const allowance = Math.min(position.accuracy ?? 0, MAX_ACCURACY_ALLOWANCE_METERS);
        const inside = distance <= radius + allowance;

        // Saada sündmus ainult siis, kui olek tegelikult muutus — muidu
        // tekiks iga dashboardi avamisega uus duplikaat.
        const previous = lastInsideRef.current;
        lastInsideRef.current = inside;

        if (previous !== null && previous !== inside) {
          await apiRequest(`/time-logs/${activeLog.id}/presence-events`, {
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
          });
        }

        if (!cancelled) onChangeRef.current({ inside, distanceMeters: Math.round(distance) });
      } catch (err) {
        console.error("Geolokatsiooni viga:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLog?.id]);
}
