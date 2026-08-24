import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { DashboardResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useGeofence } from "../hooks/useGeofence";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [presence, setPresence] = useState<{ inside: boolean; distanceMeters: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<DashboardResponse>("/me/dashboard");
      setData(res);
    } catch {
      setError("Andmete laadimine ebaõnnestus.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useGeofence(data?.activeLog ?? null, (status) => {
    setPresence(status);
    load();
  });

  if (error) return <div className="page">{error}</div>;
  if (!data) return <div className="page-loading">Laadin...</div>;

  const { activeLog, lastFinished, monthSummary } = data;

  return (
    <div className="page">
      <header className="topbar">
        <h1>Tere, {user?.username}!</h1>
        <button className="btn btn-link" onClick={() => logout()}>
          Logi välja
        </button>
      </header>

      {activeLog && presence && !presence.inside && (
        <div className="alert alert-error">
          Oled objektist {presence.distanceMeters} m kaugusel — tööaja arvestus on peatatud. Kell jookseb edasi, kui
          naased objektile.
        </div>
      )}

      <section className="card">
        {activeLog ? (
          <>
            <h2 className={presence && !presence.inside ? "" : "text-success"}>
              {presence && !presence.inside ? "Tööpäev avatud (objektilt eemal)" : "Tööle registreeritud"}
            </h2>
            <p>
              <strong>Objekt:</strong> {activeLog.object.name}
              <br />
              <strong>Alates:</strong> {new Date(activeLog.startTime).toLocaleString("et-EE")}
            </p>
          </>
        ) : (
          <>
            <h2>Aktiivset tööpäeva pole registreeritud</h2>
            {lastFinished && (
              <p>
                <strong>Viimane lõpetatud tööpäev:</strong>
                <br />
                Objekt: {lastFinished.object.name}
                <br />
                Algas: {new Date(lastFinished.startTime).toLocaleString("et-EE")}
                <br />
                Lõppes: {lastFinished.endTime && new Date(lastFinished.endTime).toLocaleString("et-EE")}
              </p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>Kuu kokkuvõte</h2>
        <dl className="stat-list">
          <div>
            <dt>Töötunde</dt>
            <dd>{monthSummary.totalHours}</dd>
          </div>
          <div>
            <dt>Tunnihind</dt>
            <dd>€{monthSummary.hourlyRate.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Teenitud</dt>
            <dd>€{monthSummary.totalEarnings.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Netopalk</dt>
            <dd>€{monthSummary.netSalary.toFixed(2)}</dd>
          </div>
        </dl>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${monthSummary.progress}%` }} />
        </div>
        <p className="subtitle">
          Eesmärk: {monthSummary.monthlyTarget} tundi ({monthSummary.progress}%)
        </p>
      </section>

      <nav className="button-stack">
        {activeLog ? (
          <Link className="btn btn-warning" to="/end-work">
            Lõpeta tööpäev
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/start-work">
            Alusta tööpäeva
          </Link>
        )}
        <Link className="btn btn-secondary" to="/history">
          Tööajalugu
        </Link>
        {user?.role === "admin" && (
          <>
            <Link className="btn btn-secondary" to="/admin/objects">
              Halda objekte
            </Link>
            <Link className="btn btn-secondary" to="/admin/users">
              Halda kasutajaid
            </Link>
            <Link className="btn btn-secondary" to="/admin/team-performance">
              Meeskonna ülevaade
            </Link>
            <Link className="btn btn-secondary" to="/admin/settings">
              Seaded
            </Link>
            <Link className="btn btn-secondary" to="/admin/reports">
              Raportid
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
