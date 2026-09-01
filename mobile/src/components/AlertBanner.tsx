import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import type { MyAlertsResponse } from "../api/types";
import { useT } from "../i18n";
import { Icon } from "../components/Icon";
import { alertBody, alertTitle } from "../pages/AlertsPage";

/**
 * Töötaja enda kahtlase tegevuse märked.
 *
 * Miks töötajale, mitte ainult haldurile: kui keegi kasutab tema kontot, on
 * see töötaja jaoks ainus viis seda avastada. Tema palk sõltub nendest
 * tundidest, seega tema peab esimesena teada saama.
 *
 * Ei blokeeri midagi ja kaob "Sain aru" peale. Vaikimisi ei ole midagi
 * näha — bänner tekib ainult siis, kui on midagi öelda.
 */
export function AlertBanner() {
  const d = useT();
  const [data, setData] = useState<MyAlertsResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<MyAlertsResponse>("/me/alerts"));
    } catch {
      // Vaikne ebaõnnestumine: märgete laadimise viga ei tohi dashboardi
      // maha võtta — tööpäeva alustamine on tähtsam.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unseen = data?.alerts.filter((a) => a.seenAt == null) ?? [];
  if (unseen.length === 0) return null;

  async function acknowledge(id: number) {
    try {
      await apiRequest(`/me/alerts/${id}/seen`, { method: "POST" });
    } finally {
      await load();
    }
  }

  return (
    <>
      {unseen.map((alert) => (
        <section key={alert.id} className="card card-warning">
          <h2>
            <Icon name="alert" /> {alertTitle(d, alert.type)}
          </h2>
          <p>{alertBody(d, alert.type)}</p>
          <p className="subtitle">{d.alerts.notBlocking}</p>
          <button type="button" className="button-secondary" onClick={() => acknowledge(alert.id)}>
            {d.alerts.markSeen}
          </button>
        </section>
      ))}
    </>
  );
}
