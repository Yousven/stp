import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Võltsitud asukoha (mock location) tuvastus.
 *
 * Nii iOS kui Android lubavad arendajarežiimis asukohta võltsida, seega
 * ilma selle kontrollita saab kohaloleku tõendi ümber kõndida ühe
 * kolmanda osapoole äpiga.
 *
 * Tuvastust EI kasutata blokeerimiseks — vale positiivne (nt seadme viga)
 * jätaks ausa töötaja tööpäevata. Lipp saadetakse serverisse ja admin
 * näeb seda raportis.
 */
interface MockLocationPlugin {
  isMocked(): Promise<{ mocked: boolean }>;
}

const MockLocationNative = registerPlugin<MockLocationPlugin>("BackgroundGeofence", {
  web: {
    async isMocked() {
      return { mocked: false };
    },
  },
});

/**
 * Kas viimane asukoht oli võltsitud?
 *
 * Capacitori Geolocation plugin ei anna seda infot, seega küsime seda
 * natiivselt. Kui natiivne meetod puudub (vanem ehitus või veeb),
 * tagastame `false` — kontrolli puudumine ei tohi tööpäeva alustamist
 * takistada.
 */
export async function isLocationMocked(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { mocked } = await MockLocationNative.isMocked();
    return mocked;
  } catch {
    return false;
  }
}
