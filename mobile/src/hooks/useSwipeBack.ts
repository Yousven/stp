import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Kui lähedalt vasakust servast peab žest algama.
 *
 * Kitsas riba on tahtlik: keset ekraani pühkimine on tavaline kerimine ja
 * lehe alla libisemine iga sõrmeliigutuse peale oleks tüütum kui puuduv
 * žest. Servast alustamine on ka see, mida iOS ja Android ise õpetavad.
 */
const EDGE_ZONE = 28;

/** Kui kaugele peab jõudma, et lahtilaskmine tagasi viiks. */
const TRIGGER_DISTANCE = 90;

/** Kaugemale leht ei libise, ka kui sõrm läheb edasi. */
const MAX_OFFSET = 140;

export interface SwipeBackState {
  /** Kui kaugele on leht libisenud, pikslites. */
  offset: number;
  /** Kas lahtilaskmine viiks tagasi. */
  ready: boolean;
}

/**
 * Servast paremale pühkides tagasi.
 *
 * Telefoniliideses ei ole püsivat menüüd — iga alamleht lõpeb "Tagasi"
 * nupuga lehe all. Nupuni jõudmiseks tuleb pikk leht lõpuni kerida, mis
 * kindaga ja kiirustades on tüütu. See žest teeb sama asja ilma kerimiseta.
 *
 * Kasutab `navigate(-1)`, mitte kindlat sihtlehte: nii jõuab vormilt tagasi
 * nimekirja, kust see avati, mitte otse esilehele. Sama, mida OS-i enda
 * tagasi-žest teeks.
 */
export function useSwipeBack(enabled: boolean): SwipeBackState {
  const navigate = useNavigate();
  const location = useLocation();

  const [offset, setOffset] = useState(0);

  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const offsetRef = useRef(0);

  // Esilehelt ei ole kuhugi tagasi minna, ja kui äpp avanes otse sellel
  // lehel (`key === "default"`), viiks tagasiminek äpist välja.
  const canGoBack = enabled && location.pathname !== "/dashboard" && location.key !== "default";

  useEffect(() => {
    if (!canGoBack) return;

    function reset() {
      startX.current = null;
      offsetRef.current = 0;
      setOffset(0);
    }

    function handleStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_ZONE) return;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
    }

    function handleMove(event: TouchEvent) {
      if (startX.current === null) return;

      const dx = event.touches[0].clientX - startX.current;
      const dy = event.touches[0].clientY - startY.current;

      // Püstine liigutus on kerimine, mitte tagasiminek.
      if (Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }

      if (dx <= 0) {
        offsetRef.current = 0;
        setOffset(0);
        return;
      }

      // Leht järgib sõrme üks-ühele, nagu OS-i enda žest. Takistust siin ei
      // ole: tagasiminek peab tunduma otsene, erinevalt alla tõmbamisest,
      // mida tahame kogemata käivitumise eest kaitsta.
      if (event.cancelable) event.preventDefault();

      const next = Math.min(dx, MAX_OFFSET);
      offsetRef.current = next;
      setOffset(next);
    }

    function handleEnd() {
      if (startX.current === null) return;
      const travelled = offsetRef.current;
      startX.current = null;
      offsetRef.current = 0;
      setOffset(0);

      if (travelled >= TRIGGER_DISTANCE) navigate(-1);
    }

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
  }, [canGoBack, navigate]);

  return { offset, ready: offset >= TRIGGER_DISTANCE };
}
