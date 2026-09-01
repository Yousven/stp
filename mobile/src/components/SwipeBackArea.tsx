import type { ReactNode } from "react";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { Icon } from "./Icon";

/**
 * Servast paremale pühkides tagasi — telefoniliidese raam.
 *
 * Leht libiseb sõrme järel paremale ja vasakusse serva ilmub nool, mis
 * läheb siniseks siis, kui lahtilaskmine päriselt tagasi viib. Ilma selle
 * tagasisideta oleks žest nähtamatu: kasutaja ei teaks, kas ta tõmbas
 * piisavalt kaugele, enne kui on juba lahti lasknud.
 *
 * Transform pannakse külge AINULT žesti ajal. Liikumatu `transform` teeks
 * sellest konteinerist `position: fixed` elementide baasi ja nihutaks
 * paigast alla tõmbamise indikaatori, mis on samuti fikseeritud.
 */
export function SwipeBackArea({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const { offset, ready } = useSwipeBack(enabled);

  return (
    <>
      {offset > 0 && (
        <div
          className={`swipe-back${ready ? " swipe-back--ready" : ""}`}
          style={{ opacity: Math.min(offset / 45, 1) }}
          aria-hidden="true"
        >
          <Icon name="chevronLeft" size={24} />
        </div>
      )}
      <div
        className={offset > 0 ? "swipe-back-page swipe-back-page--moving" : "swipe-back-page"}
        style={offset > 0 ? { transform: `translateX(${offset}px)` } : undefined}
      >
        {children}
      </div>
    </>
  );
}
