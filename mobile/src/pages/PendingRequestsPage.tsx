import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { AdminUser } from "../api/types";
import { useLocale, useT } from "../i18n";

export function PendingRequestsPage() {
  const d = useT();
  const locale = useLocale();
  const [requests, setRequests] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  // Tunnihind on kinnitamisel kohustuslik, seega hoiame iga taotluse kohta
  // eraldi sisestatud väärtust.
  const [rates, setRates] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      setRequests(await apiRequest<AdminUser[]>("/users/pending"));
    } catch {
      setError(d.pendingRequests.loadFailed);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(user: AdminUser) {
    const rate = Number(rates[user.id] ?? "");
    if (!rates[user.id] || Number.isNaN(rate) || rate < 0) {
      setError(d.pendingRequests.rateRequired(user.username));
      return;
    }
    setError("");
    setBusyId(user.id);
    try {
      await apiRequest(`/users/${user.id}/approve`, { method: "POST", body: { hourlyRate: rate } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.pendingRequests.approveFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(user: AdminUser) {
    setError("");
    setBusyId(user.id);
    try {
      await apiRequest(`/users/${user.id}/reject`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.pendingRequests.rejectFailed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <h1>{d.pendingRequests.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!requests && !error && <div className="page-loading">{d.common.loading}</div>}
      {requests && requests.length === 0 && <div className="alert alert-info">{d.pendingRequests.none}</div>}
      {requests && requests.length > 0 && (
        <ul className="log-list">
          {requests.map((user) => (
            <li key={user.id} className="card log-item">
              <strong>{user.username}</strong>
              <div>{user.email}</div>
              {user.requestedAt && (
                <div className="subtitle">{d.pendingRequests.requestedAt(new Date(user.requestedAt).toLocaleString(locale))}</div>
              )}
              <label style={{ marginTop: "0.5rem" }}>
                {d.userForm.hourlyRate} (€)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates[user.id] ?? ""}
                  onChange={(e) => setRates({ ...rates, [user.id]: e.target.value })}
                  placeholder={d.pendingRequests.hourlyRatePlaceholder}
                />
              </label>
              <div className="button-stack" style={{ marginTop: "0.5rem" }}>
                <button className="btn btn-primary" disabled={busyId === user.id} onClick={() => approve(user)}>
                  {d.pendingRequests.approve}
                </button>
                <button className="btn btn-secondary" disabled={busyId === user.id} onClick={() => reject(user)}>
                  {d.pendingRequests.reject}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
