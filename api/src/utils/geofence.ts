const EARTH_RADIUS_METERS = 6371000;

// Haversine'i valem — port praeguse dashboard.php brauseri-JS samast funktsioonist.
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * GPS-i ebatäpsuse varu: telefon võib teatada asukoha kuni ~paarikümne
 * meetrise veaga, seega lubame raadiusele lisaks seadme enda teatatud
 * täpsuse (kuni 100 m), et objekti servas seisev töötaja ei jääks kinni.
 *
 * Ülempiir on oluline: ilma selleta saaks klient teatada täpsuseks 50 km
 * ja igast asukohast "objektil" olla.
 */
export const MAX_ACCURACY_ALLOWANCE_METERS = 100;

export interface GeofenceTarget {
  latitude: number;
  longitude: number;
  radius: number;
}

export interface GeofenceReading {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface GeofenceResult {
  inside: boolean;
  /** Meetrites, ümardamata — sõnumi jaoks ümardab kutsuja. */
  distance: number;
  /** Kui palju täpsuse tõttu raadiusele juurde anti. */
  allowance: number;
}

/**
 * Kas mõõtmine on objekti geofence'i sees.
 *
 * ÜKS koht, kus see reegel elab. Varem oli sama arvutus kirjutatud
 * `/time-logs/start` sisse ja kohaloleku sündmusi ei kontrollitud üldse —
 * ehk tööpäeva alustamine oli tõendatud, aga peatatud kella uuesti
 * käima panemine mitte. Kui reegel on kahes kohas, lähevad nad lahku.
 */
export function checkGeofence(target: GeofenceTarget, reading: GeofenceReading): GeofenceResult {
  const distance = distanceMeters(
    reading.latitude,
    reading.longitude,
    target.latitude,
    target.longitude
  );
  const allowance = Math.min(Math.max(reading.accuracy ?? 0, 0), MAX_ACCURACY_ALLOWANCE_METERS);
  return { inside: distance <= target.radius + allowance, distance, allowance };
}
