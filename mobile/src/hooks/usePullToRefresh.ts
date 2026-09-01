import { useEffect, useRef, useState } from "react";

/** Kui kaugele tõmmatuna lahtilaskmine värskenduse käivitab. */
const TRIGGER_DISTANCE = 72;

/** Kaugemale indikaator ei liigu, ka kui sõrm läheb edasi. */
const MAX_DISTANCE = 110;

/**
 * Takistus: indikaator liigub poole aeglasemalt kui sõrm.
 *
 * Ilma selleta käivitub värskendus kogemata iga kord, kui keegi kindaga
 * ekraani pühib. Takistusega on liigutus tahtlik.
 */
const RESISTANCE = 0.5;

export interface PullToRefreshState {
  /** Kui kaugele on tõmmatud, pikslites (takistus juba arvestatud). */
  distance: number;
  /** Kas lahtilaskmine käivitaks värskenduse. */
  ready: boolean;
  /** Värskendus käib parasjagu. */
  refreshing: boolean;
}

/**
 * Alla tõmmates värskendamine ("pull to refresh").
 *
 * Äpp laeb andmed ise, kui ekraan avatakse või taustalt naaseb, aga kui
 * midagi tundub vale või vana, tahab inimene seda ise üle kontrollida,
 * ilma äppi sulgemata. Objektil on see tavaline: võrk käib ära ja tagasi,
 * ja käsitsi värskendamine on kiirem kui arvata, millal äpp ise proovib.
 *
 * Toetub `document.scrollingElement`-ile, kuna nii telefoni- kui
 * arvutiliideses keritakse dokumenti ennast, mitte eraldi konteinerit.
 *
 * Puutega seadmele: `enabled=false` lülitab kuulajad üldse välja, et
 * arvutiliides ei paneks tarbetuid `touchmove` kuulajaid külge.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown> | unknown,
  enabled = true
): PullToRefreshState {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Sündmusekuulajad on külge pandud üks kord ega näe uuenenud state'i,
  // seega hoiame otsustamiseks vajalikku eraldi ref'is.
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    function scrollTop(): number {
      return document.scrollingElement?.scrollTop ?? window.scrollY;
    }

    function reset() {
      startY.current = null;
      startX.current = 0;
      distanceRef.current = 0;
      setDistance(0);
    }

    function handleStart(event: TouchEvent) {
      // Mitme sõrmega žest on suumimine, mitte värskendamine.
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (scrollTop() > 0) return;
      startY.current = event.touches[0].clientY;
      startX.current = event.touches[0].clientX;
    }

    function handleMove(event: TouchEvent) {
      if (startY.current === null) return;

      // Kui vahepeal keriti allapoole, ei ole see enam värskendusliigutus.
      if (scrollTop() > 0) {
        reset();
        return;
      }

      const delta = event.touches[0].clientY - startY.current;

      // Külgsuunaline liigutus ei ole värskendamine: lehe ülaservas võib
      // olla laia tabeliga kaart (nt arve read), mida keritakse külgsuunas.
      // Ilma selle kontrollita jääks see kerimine kinni.
      const deltaX = Math.abs(event.touches[0].clientX - startX.current);
      if (deltaX > Math.abs(delta)) {
        reset();
        return;
      }

      if (delta <= 0) {
        distanceRef.current = 0;
        setDistance(0);
        return;
      }

      // Takista lehe enda kummitamist (iOS-i rubber-band), muidu liiguks
      // korraga kaks asja ja žest tunduks katkine.
      if (event.cancelable) event.preventDefault();

      const next = Math.min(delta * RESISTANCE, MAX_DISTANCE);
      distanceRef.current = next;
      setDistance(next);
    }

    async function handleEnd() {
      if (startY.current === null) return;
      const pulled = distanceRef.current;
      startY.current = null;

      if (pulled < TRIGGER_DISTANCE) {
        distanceRef.current = 0;
        setDistance(0);
        return;
      }

      // Hoia indikaator käivituskaugusel, kuni päring käib — muidu kaob
      // ketas ära enne, kui inimene jõuab aru saada, et midagi juhtus.
      refreshingRef.current = true;
      setRefreshing(true);
      distanceRef.current = TRIGGER_DISTANCE;
      setDistance(TRIGGER_DISTANCE);

      try {
        await onRefreshRef.current();
      } catch {
        // Vea näitamine on kutsuja asi (tal on juba veateade olemas) —
        // siin on tähtis, et indikaator igal juhul kaoks.
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        distanceRef.current = 0;
        setDistance(0);
      }
    }

    // passive: false on vajalik, et saaks preventDefault't kutsuda.
    window.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", reset);

    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [enabled]);

  return { distance, ready: distance >= TRIGGER_DISTANCE, refreshing };
}
