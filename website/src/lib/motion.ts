import { gsap, ScrollTrigger, DESKTOP_QUERY } from "./gsap";

/**
 * Ühine liikumisruntime.
 *
 * Miks see olemas on: iga sektsioon kirjutas varem oma `matchMedia`-ploki,
 * oma trigger'i ja oma koristuse. Tulemus oli, et S4–S10 said kõik sama
 * "0.5 s fade + 20 px" mustri ja mitte ükski neist ei olnud kerimisega
 * seotud. Siin on kolm asja, mida iga sektsioon vajab ja mida ei ole mõtet
 * seitse korda ümber kirjutada:
 *
 *   1. VEAKINDLUS — üks katkine sektsioon ei tohi järgmisi maha võtta.
 *      Nii `motion()` kui `when()` on try/catch sees.
 *   2. REFRESH — triggerite positsioone tuleb üle arvutada siis, kui fondid
 *      ja pildid on lõpliku mõõdu saanud, mitte skripti käivitumise hetkel.
 *   3. ÜHINE KEEL — `maskUp` ja `drawX` on need kaks liigutust, millest
 *      terve leht koosneb. Kui nad on ühes kohas, ei lähe sektsioonid
 *      märkamatult lahku.
 */

/** Tavarežiim: kasutaja EI ole palunud liikumist vähendada. */
export const MOTION = "(prefers-reduced-motion: no-preference)";
/** Lai ekraan + liikumine lubatud. */
export const DESKTOP = `${DESKTOP_QUERY} and ${MOTION}`;
/** Kitsas ekraan + liikumine lubatud. */
export const NARROW = `(max-width: 899px) and ${MOTION}`;

let refreshBound = false;

/**
 * Üks `ScrollTrigger.refresh()` pärast seda, kui leht on lõpliku mõõdu
 * saanud. Fondi vahetus ja laisalt laetud pilt muudavad kõrgusi; ilma
 * refresh'ita jäävad allpool olevate sektsioonide start/end vanadele
 * väärtustele.
 */
function bindRefresh(): void {
  if (refreshBound) return;
  refreshBound = true;

  const refresh = () => requestAnimationFrame(() => ScrollTrigger.refresh());

  if (document.readyState === "complete") refresh();
  else window.addEventListener("load", refresh, { once: true });

  document.fonts?.ready.then(refresh).catch(() => {});
}

interface Ctx {
  /** Sektsiooni juurelement. */
  root: HTMLElement;
  /** Esimene vaste sektsiooni seest. */
  q: <T extends HTMLElement>(selector: string) => T | null;
  /** Kõik vasted sektsiooni seest, massiivina. */
  all: <T extends HTMLElement>(selector: string) => T[];
  /**
   * Meediapäringu-plokk. Tagastatav funktsioon on koristus, täpselt nagu
   * `gsap.matchMedia()` puhul — aga erind siin ei lekki välja.
   *
   * Päring võib olla string või nimede kaart (`{ wide: DESKTOP, narrow:
   * NARROW }`), mille puhul `self.conditions` ütleb, kumb kehtib. Nii ei
   * ole vaja sama jada kaks korda kirjutada, kui erinevus on ainult
   * liikumise ulatuses.
   */
  when: (
    query: string | Record<string, string>,
    build: (self: { conditions?: Record<string, boolean> }) => (() => void) | void,
  ) => void;
}

/**
 * Seab ühe sektsiooni liikumise üles.
 *
 * Kui juurelementi lehel ei ole (teine keel, teine leht), ei tehta midagi
 * ja viga ei visata.
 */
export function motion(name: string, rootSelector: string, setup: (ctx: Ctx) => void): void {
  const root = document.querySelector<HTMLElement>(rootSelector);
  if (!root) return;

  const mm = gsap.matchMedia();

  const ctx: Ctx = {
    root,
    q: <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector),
    all: <T extends HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector)),
    when: (query, build) => {
      mm.add(query as string, (self) => {
        try {
          return build(self as { conditions?: Record<string, boolean> });
        } catch (error) {
          console.warn(`[motion] ${name} (${JSON.stringify(query)}):`, error);
          return undefined;
        }
      });
    },
  };

  try {
    setup(ctx);
  } catch (error) {
    console.warn(`[motion] ${name}:`, error);
  }

  bindRefresh();
}

/**
 * Teksti ilmumine maski alt.
 *
 * `clip-path`, mitte `overflow: hidden` ümbris — nii ei ole vaja markupi
 * juurde ühtegi lisa-`span`-i. Külgedel on varu, sest kaldkirjas Condensed
 * ulatub oma reakastist välja ja täpne `inset(… 0 …)` lõikaks tähed ära.
 */
export const MASKED = { clipPath: "inset(-0.14em -8% 110% -8%)", yPercent: 26 } as const;
export const UNMASKED = { clipPath: "inset(-0.14em -8% -0.3em -8%)", yPercent: 0 } as const;

/** Algseis: rida on maski taga. Kutsu ainult siis, kui liikumine on lubatud. */
export function hideLines(targets: gsap.TweenTarget): void {
  gsap.set(targets, MASKED);
}

/** Joone tõmbamine vasakult paremale. Kasutame seda eraldajate ja mõõtjoonte peal. */
export function drawX(targets: gsap.TweenTarget): void {
  gsap.set(targets, { scaleX: 0, transformOrigin: "left center" });
}

export { gsap, ScrollTrigger };
