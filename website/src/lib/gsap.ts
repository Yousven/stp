import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Üks koht, kust GSAP tuleb.
 *
 * Iga komponent impordib siit, mitte otse `gsap`-ist. Muidu registreeritakse
 * ScrollTrigger mitu korda ja iga saar seab omad vaikeväärtused, mis lähevad
 * märkamatult lahku.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  /*
   * Mobiilibrauseri aadressiriba peitmine muudab `innerHeight`-i ja käivitaks
   * muidu keset kerimist täieliku ümberarvutuse — sektsioonid hüppaksid.
   * Päris suurusemuutus (pööramine, akna venitamine) käivitab refresh'i
   * endiselt.
   */
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/**
 * Kas kasutaja on palunud liikumist vähendada.
 *
 * Sel juhul EI tehta pinni ega scrub'i: animatsioon asendatakse lõppseisuga,
 * mis peab olema iseseisvalt loetav. Scroll-jutustus ei tohi olla ainus viis
 * sisuni jõuda.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Piir, kust alates kasutame pinnitud desktop-versiooni. */
export const DESKTOP_QUERY = "(min-width: 900px)";

export { gsap, ScrollTrigger };
