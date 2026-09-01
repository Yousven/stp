import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import type { AdminAlertsResponse, SecurityAlert } from "../api/types";
import { useT } from "../i18n";
import { Icon } from "../components/Icon";

/**
 * Halduri vaade kahtlasele tegevusele.
 *
 * MIDAGI SIIT EI PARANDATA. Tunde muudetakse tööajaloos käsitsi, mis nõuab
 * põhjendust ja läheb audit-logisse — see leht ütleb ainult, MIDA vaadata.
 * Nii jääb parandus ühte kohta ja iga muudatus jätab jälje.
 */
export function AlertsPage() {
  const d = useT();
  const [data, setData] = useState<AdminAlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<AdminAlertsResponse>("/alerts"));
    } catch {
      setError(d.common.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: number) {
    setBusy(id);
    try {
      await apiRequest(`/alerts/${id}/review`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-error">{error}</p>;

  return (
    <main className="page">
      <h1>{d.alerts.title}</h1>
      <p className="subtitle">{d.alerts.notBlocking}</p>

      {data && data.alerts.length === 0 && <p className="subtitle">{d.alerts.none}</p>}

      <ul className="log-list">
        {data?.alerts.map((alert) => (
          <li key={alert.id} className="log-item">
            <div className="log-row">
              <div>
                <div className="log-title">
                  <Icon name="alert" /> {alertTitle(d, alert.type)}
                </div>
                <div className="subtitle">
                  {alert.user?.username} · {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
              {alert.reviewedAt ? (
                <span className="subtitle">{d.alerts.reviewed}</span>
              ) : (
                <button
                  type="button"
                  className="button-secondary"
                  disabled={busy === alert.id}
                  onClick={() => review(alert.id)}
                >
                  {d.alerts.markReviewed}
                </button>
              )}
            </div>
            <p className="log-comment">{alertBody(d, alert.type)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

type Dict = ReturnType<typeof useT>;

export function alertTitle(d: Dict, type: string): string {
  if (type === "device_mismatch") return d.alerts.deviceMismatchTitle;
  if (type === "mock_location") return d.alerts.mockLocationTitle;
  if (type === "clock_drift") return d.alerts.clockDriftTitle;
  return type;
}

export function alertBody(d: Dict, type: string): string {
  if (type === "device_mismatch") return d.alerts.deviceMismatchBody;
  if (type === "mock_location") return d.alerts.mockLocationBody;
  if (type === "clock_drift") return d.alerts.clockDriftBody;
  return "";
}

export type { SecurityAlert };
