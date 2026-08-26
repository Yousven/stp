import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

export type Layout = "phone" | "desktop";

/**
 * Millisele liidesele see seade sobib.
 *
 * Kaks päris erinevat kasutajat: objektil olev töötaja telefonis, kes tahab
 * ühte nuppu, ja juhataja või raamatupidaja arvutis, kes haldab andmeid.
 * Sama koodibaas teenindab mõlemat, aga raamistik on erinev.
 *
 * Natiivne äpp on ALATI telefoniliides, ka iPadil või suurel ekraanil:
 * seal on tööpäeva alustamine mõttekas ja asukoht olemas. Brauseris
 * otsustab akna laius — kitsas brauseriaken telefonis peab andma sama
 * liidese, mida sama inimene äpist ootab.
 */
const DESKTOP_MIN_WIDTH = 900;

function detect(): Layout {
  if (Capacitor.isNativePlatform()) return "phone";
  if (typeof window === "undefined") return "phone";
  return window.innerWidth >= DESKTOP_MIN_WIDTH ? "desktop" : "phone";
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(detect);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    // Akna suuruse muutmine peab liidest kohe vahetama, mitte ootama
    // lehe uuesti laadimist — arvutis venitatakse akent pidevalt.
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const update = () => setLayout(media.matches ? "desktop" : "phone");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return layout;
}

/** Kas tööpäeva saab siit seadmest alustada. */
export function useCanTrackTime(): boolean {
  // Arvutis ei ole asukohta, mille põhjal kohalolekut tõendada — ja server
  // keelduks niikuinii. Nuppu ei ole mõtet näidata, et see siis viga annaks.
  return useLayout() === "phone";
}
