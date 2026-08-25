import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { apiRequest } from "../api/client";
import type { TimeLog } from "../api/types";
import { BackgroundGeofence } from "../plugins/backgroundGeofence";

/**
 * Seob natiivse taustajälgimise aktiivse tööpäevaga.
 *
 * - Tööpäeva alustamisel registreerib objekti ringi OS-i valvesse.
 * - Tööpäeva lõpetamisel lõpetab valvamise (muidu kuluks aku asjata).
 * - Äpi avamisel/taasaktiveerimisel tõstab seadmes kogunenud sündmused
 *   serverisse ja tühjendab järjekorra.
 *
 * Veebis on plugin no-op (vt backgroundGeofence.ts web-implementatsioon),
 * seega see hook on brauseris ohutu.
 */
export function useBackgroundGeofence(activeLog: TimeLog | null, onSynced: () => void) {
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  // Sünkroniseerimine: tõsta natiivne järjekord serverisse.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function flush(logId: number) {
      try {
        const { events } = await BackgroundGeofence.getPendingEvents();
        if (cancelled || events.length === 0) return;

        await apiRequest(`/time-logs/${logId}/presence-events`, {
          method: "POST",
          body: {
            events: events.map((e) => ({
              type: e.type,
              occurredAt: e.occurredAt,
              latitude: e.latitude,
              longitude: e.longitude,
              accuracy: e.accuracy,
              mocked: e.mocked ?? false,
              source: "native",
            })),
          },
        });

        // Kustuta ainult see, mis jõudis serverisse — vahepeal lisandunud
        // sündmused jäävad järjekorda alles.
        const newest = events.reduce((max, e) => (e.occurredAt > max ? e.occurredAt : max), events[0].occurredAt);
        await BackgroundGeofence.clearPendingEvents({ upTo: newest });

        if (!cancelled) onSyncedRef.current();
      } catch (err) {
        // Ebaõnnestunud üleslaadimine ei ole kriitiline: sündmused jäävad
        // järjekorda ja proovime uuesti järgmisel äpi avamisel.
        console.error("Kohaloleku sündmuste sünkroonimine ebaõnnestus:", err);
      }
    }

    if (activeLog) flush(activeLog.id);

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && activeLog) flush(activeLog.id);
    });

    return () => {
      cancelled = true;
      listener.then((l) => l.remove());
    };
  }, [activeLog?.id]);

  // Jälgimise käivitamine/lõpetamine vastavalt aktiivsele tööpäevale.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (!activeLog) {
      BackgroundGeofence.stopMonitoring().catch(() => undefined);
      return;
    }

    const { latitude, longitude, radius } = activeLog.object;
    if (latitude == null || longitude == null || radius == null) return;

    (async () => {
      try {
        const permission = await BackgroundGeofence.checkPermissions();
        if (permission.location !== "granted") {
          // Ära pealetükkivalt küsi — kasutaja saab taustaloa anda
          // Dashboardilt nupuga (vt BackgroundTrackingNotice).
          return;
        }
        await BackgroundGeofence.startMonitoring({
          identifier: `timelog-${activeLog.id}`,
          latitude: Number(latitude),
          longitude: Number(longitude),
          radius: Number(radius),
        });
      } catch (err) {
        console.error("Taustajälgimise käivitamine ebaõnnestus:", err);
      }
    })();
  }, [activeLog?.id]);
}

/** Kas natiivne taustajälgimine on lubatud (Dashboardi teavituse jaoks). */
export async function checkBackgroundPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  try {
    const { location } = await BackgroundGeofence.checkPermissions();
    return location;
  } catch {
    return "unsupported";
  }
}

export async function requestBackgroundPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  try {
    const { location } = await BackgroundGeofence.requestPermissions();
    return location;
  } catch {
    return "unsupported";
  }
}
