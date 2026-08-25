import { registerPlugin } from "@capacitor/core";

export interface QueuedGeofenceEvent {
  type: "ENTER" | "EXIT";
  /** ISO 8601, pandud OS-i poolt sündmuse toimumise hetkel. */
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  /** Seade teatas võltsitud asukohast. */
  mocked?: boolean;
}

export interface BackgroundGeofencePlugin {
  /**
   * Registreerib OS-ile ühe valvatava ringi. OS äratab äpi ainult piiri
   * ületamisel — see on aku mõttes kordades odavam kui pidev asukoha
   * pollimine, kuna kasutab mobiilimaste/WiFi-t, mitte pidevat GPS-i.
   */
  startMonitoring(options: {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number;
  }): Promise<void>;

  /** Lõpetab valvamise (tööpäeva lõpetamisel). */
  stopMonitoring(): Promise<void>;

  /**
   * Tagastab seadmes järjekorda kogutud sündmused. Natiivne pool ei tee ise
   * HTTP-päringuid — nii ei pea JWT/refresh loogikat Swiftis ja Kotlinis
   * dubleerima. Sündmused kannavad OS-i ajatemplit, seega hiline
   * üleslaadimine ei riku tundide arvestust.
   */
  getPendingEvents(): Promise<{ events: QueuedGeofenceEvent[] }>;

  /** Kustutab järjekorra pärast edukat serverisse saatmist. */
  clearPendingEvents(options: { upTo: string }): Promise<void>;

  /** Kas taustaluba ("Always") on antud. */
  checkPermissions(): Promise<{ location: "granted" | "denied" | "prompt" }>;

  /** Küsib taustaluba. iOS-il näidatakse seda alles pärast "When In Use" luba. */
  requestPermissions(): Promise<{ location: "granted" | "denied" | "prompt" }>;
}

export const BackgroundGeofence = registerPlugin<BackgroundGeofencePlugin>("BackgroundGeofence", {
  // Veebis (brauseris admin-kasutuseks) natiivset taustajälgimist pole —
  // vaikimisi implementatsioon hoiab ära "plugin not implemented" vead.
  web: {
    async startMonitoring() {
      /* veebis ei toetata — esiplaani kontroll useGeofence's katab selle */
    },
    async stopMonitoring() {},
    async getPendingEvents() {
      return { events: [] };
    },
    async clearPendingEvents() {},
    async checkPermissions() {
      return { location: "denied" as const };
    },
    async requestPermissions() {
      return { location: "denied" as const };
    },
  },
});
