import type { PullToRefreshState } from "../hooks/usePullToRefresh";
import { Icon } from "./Icon";

/**
 * Alla tõmbamise indikaator.
 *
 * Ainult ikoon, ilma tekstita: liigutus on ise seletus ja neljas keeles
 * silti ei jõua keegi poole žesti pealt lugeda. Värv ütleb, kas lahti
 * lastes midagi juhtub — hall veel mitte, sinine juba jah. Rohelist ja
 * punast siin ei kasutata, need tähendavad äpis kella seisu.
 */
export function PullToRefreshIndicator({ state }: { state: PullToRefreshState }) {
  const { distance, ready, refreshing } = state;

  if (distance <= 0) return null;

  return (
    <div
      className={`pull-refresh${ready ? " pull-refresh--ready" : ""}${refreshing ? " pull-refresh--spinning" : ""}`}
      style={{
        transform: `translate(-50%, ${distance}px)`,
        // Ilmub sujuvalt, et kogemata alustatud liigutus ei viskaks kohe
        // ketast ekraanile.
        opacity: Math.min(distance / 40, 1),
      }}
      aria-hidden="true"
    >
      <span
        className="pull-refresh-icon"
        // Pöördub tõmbamise võrra; värskendamise ajal võtab pöörlemise üle
        // CSS-animatsioon ja see nurk ei loe.
        style={refreshing ? undefined : { transform: `rotate(${distance * 3}deg)` }}
      >
        <Icon name="refresh" size={24} />
      </span>
    </div>
  );
}
