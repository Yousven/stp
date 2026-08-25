import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { DashboardResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useGeofence } from "../hooks/useGeofence";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { clearActiveLog, readActiveLog, writeActiveLog } from "../api/offlineCache";
import { isOfflineError } from "../api/offlineQueue";
import {
  checkBackgroundPermission,
  requestBackgroundPermission,
  useBackgroundGeofence,
} from "../hooks/useBackgroundGeofence";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [presence, setPresence] = useState<{ inside: boolean; distanceMeters: number } | null>(null);
  const [backgroundPermission, setBackgroundPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported" | null
  >(null);
  // Levita kuvatakse vahemälust: muidu ei jõuaks töötaja siit üldse
  // "Lõpeta tööpäev" nupuni ja päev jääks sulgemata.
  const [offlineLog, setOfflineLog] = useState<{ objectName: string; startTime: string } | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<DashboardResponse>("/me/dashboard");
      setData(res);
      setError("");
      setOfflineLog(null);
      setOffline(false);
      if (res.activeLog) {
        await writeActiveLog({
          logId: res.activeLog.id,
          objectName: res.activeLog.object.name,
          startTime: res.activeLog.startTime,
        });
      } else {
        await clearActiveLog();
      }
    } catch (err) {
      if (!isOfflineError(err)) {
        setError("Andmete laadimine ebaõnnestus.");
        return;
      }
      // Ühenduseta: tööpäeva peab saama nii alustada kui lõpetada, seega
      // näitame vahemälu ka siis, kui aktiivset tööpäeva ei ole.
      const cached = await readActiveLog();
      setOfflineLog(cached ? { objectName: cached.objectName, startTime: cached.startTime } : null);
      setOffline(true);
      setError("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useGeofence(data?.activeLog ?? null, (status) => {
    setPresence(status);
    load();
  });

  // Natiivne taustajälgimine: registreerib objekti OS-i valvesse ja tõstab
  // seadmes kogunenud sündmused serverisse äpi avamisel.
  useBackgroundGeofence(data?.activeLog ?? null, load);

  // Offline salvestatud tegevused saadetakse ära, kui võrk taastub.
  const { pending: offlinePending, lastResult: offlineResult, clearResult } = useOfflineSync(load);

  useEffect(() => {
    checkBackgroundPermission().then(setBackgroundPermission);
  }, [data?.activeLog?.id]);

  async function enableBackgroundTracking() {
    const result = await requestBackgroundPermission();
    setBackgroundPermission(result);
    if (result === "granted") load();
  }

  if (error) return <div className="page">{error}</div>;

  // Ühenduseta vaade: ainult see, mis on telefonis teada, ja tee tööpäeva
  // lõpetamiseni. Kuu kokkuvõtet ei saa arvutada ilma serverita.
  if (!data && offline) {
    return (
      <div className="page">
        <header className="topbar">
          <h1>Tere, {user?.username}!</h1>
        </header>
        <div className="alert alert-info">
          Ühendust pole. Näidatakse telefoni salvestatud andmeid; tehtu saadetakse ära, kui võrk taastub.
        </div>
        <section className="card">
          {offlineLog ? (
            <>
              <h2>Tööpäev avatud</h2>
              <p>
                <strong>Objekt:</strong> {offlineLog.objectName}
                <br />
                <strong>Alates:</strong> {new Date(offlineLog.startTime).toLocaleString("et-EE")}
              </p>
            </>
          ) : (
            <h2>Aktiivset tööpäeva pole registreeritud</h2>
          )}
        </section>
        <nav className="button-stack">
          {offlineLog ? (
            <Link className="btn btn-warning" to="/end-work">
              Lõpeta tööpäev
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/start-work">
              Alusta tööpäeva
            </Link>
          )}
        </nav>
      </div>
    );
  }

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

      {offlinePending > 0 && (
        <div className="alert alert-info">
          {offlinePending} salvestatud tegevus{offlinePending > 1 ? "t" : ""} ootab ühendust. Need saadetakse
          automaatselt, kui võrk taastub.
        </div>
      )}

      {offlineResult && offlineResult.rejected.length > 0 && (
        <div className="alert alert-error">
          <strong>Osa salvestatud tegevusi ei õnnestunud saata:</strong>
          {offlineResult.rejected.map((r, i) => (
            <div key={i}>
              {r.label}: {r.reason}
            </div>
          ))}
          <button className="btn btn-link" style={{ padding: "0.35rem 0" }} onClick={clearResult}>
            Sulge
          </button>
        </div>
      )}

      {user?.role === "admin" && (data.pendingRequests ?? 0) > 0 && (
        <Link to="/admin/requests" className="alert alert-info" style={{ display: "block", textDecoration: "none" }}>
          <strong>
            {data.pendingRequests} uus liitumistaotlus{(data.pendingRequests ?? 0) > 1 ? "t" : ""}
          </strong>{" "}
          ootab kinnitamist — vajuta siia.
        </Link>
      )}

      {activeLog && (backgroundPermission === "prompt" || backgroundPermission === "denied") && (
        <div className="alert alert-info">
          Luba asukoht ka taustal, siis märgitakse objektilt lahkumine ja naasmine automaatselt ka suletud rakenduse
          korral. Asukohta ei jälgita pidevalt — ainult objekti piiri ületamisel, seega akut see praktiliselt ei kuluta.
          <button className="btn btn-link" style={{ padding: "0.35rem 0" }} onClick={enableBackgroundTracking}>
            Luba taustal
          </button>
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
            <Link className="btn btn-secondary" to="/admin/requests">
              Liitumistaotlused{(data.pendingRequests ?? 0) > 0 ? ` (${data.pendingRequests})` : ""}
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
