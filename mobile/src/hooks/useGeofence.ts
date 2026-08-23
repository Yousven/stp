import { Geolocation } from "@capacitor/geolocation";
import { useEffect } from "react";
import { apiRequest } from "../api/client";
import type { TimeLog } from "../api/types";

const EARTH_RADIUS_METERS = 6371000;

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

// Esiplaani geofence-kontroll: pariteet praeguse veebirakendusega (kontroll
// ainult siis, kui vaade on lahti). Taustal töötav kontroll (native
// background-geolocation plugin) lisandub Faas 2 järgmises etapis, kui
// äpp on Android/iOS seadmes testitav.
export function useGeofence(activeLog: TimeLog | null, onAutoEnded: () => void) {
  useEffect(() => {
    if (!activeLog) return;
    const { latitude, longitude, radius } = activeLog.object;
    if (latitude == null || longitude == null || radius == null) return;

    let cancelled = false;

    (async () => {
      try {
        const position = await Geolocation.getCurrentPosition({ timeout: 10000 });
        if (cancelled) return;
        const distance = distanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          Number(latitude),
          Number(longitude)
        );
        if (distance > radius) {
          await apiRequest(`/time-logs/${activeLog.id}/end`, {
            method: "POST",
            body: { comment: "Tööpäev lõpetatud automaatselt kuna töötaja oli raadiusest väljas" },
          });
          if (!cancelled) onAutoEnded();
        }
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
