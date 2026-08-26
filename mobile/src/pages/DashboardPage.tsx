import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { DashboardResponse, OnboardingState } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useLocale, useT } from "../i18n";
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
  const d = useT();
  const locale = useLocale();
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
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

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
        setError(d.common.loadFailed);
        return;
      }
      // Ühenduseta: tööpäeva peab saama nii alustada kui lõpetada, seega
      // näitame vahemälu ka siis, kui aktiivset tööpäeva ei ole.
      const cached = await readActiveLog();
      setOfflineLog(cached ? { objectName: cached.objectName, startTime: cached.startTime } : null);
      setOffline(true);
      setError("");
    }
  }, [d]);

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

  // Seadistusjuhis jääb silme ette, kuni ettevõte on päriselt töövalmis.
  // Ilma objektita ei saa keegi tööpäeva alustada, seega vaikselt tühjale
  // dashboardile jätmine oleks umbtee.
  useEffect(() => {
    if (user?.role !== "admin") return;
    apiRequest<OnboardingState>("/me/onboarding")
      .then(setOnboarding)
      .catch(() => setOnboarding(null));
  }, [user?.role, data?.activeLog?.id]);

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
          <h1>{d.dashboard.greeting(user?.username ?? "")}</h1>
        </header>
        <div className="alert alert-info">
          {d.dashboard.offlineNotice}
        </div>
        <section className="card">
          {offlineLog ? (
            <>
              <h2>{d.dashboard.workdayOpen}</h2>
              <p>
                <strong>{d.common.object}:</strong> {offlineLog.objectName}
                <br />
                <strong>{d.dashboard.since}:</strong> {new Date(offlineLog.startTime).toLocaleString(locale)}
              </p>
            </>
          ) : (
            <h2>{d.dashboard.noActiveWorkday}</h2>
          )}
        </section>
        <nav className="button-stack">
          {offlineLog ? (
            <Link className="btn btn-warning" to="/end-work">
              {d.dashboard.endWork}
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/start-work">
              {d.dashboard.startWork}
            </Link>
          )}
        </nav>
      </div>
    );
  }

  if (!data) return <div className="page-loading">{d.common.loading}</div>;

  const { activeLog, lastFinished, monthSummary } = data;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.dashboard.greeting(user?.username ?? "")}</h1>
        <button className="btn btn-link" onClick={() => logout()}>
          {d.login.logout}
        </button>
      </header>

      {activeLog && presence && !presence.inside && (
        <div className="alert alert-error">
          {d.dashboard.awayFromSite(presence.distanceMeters)}
        </div>
      )}

      {offlinePending > 0 && (
        <div className="alert alert-info">
          {d.dashboard.offlinePending(offlinePending)}
        </div>
      )}

      {offlineResult && offlineResult.rejected.length > 0 && (
        <div className="alert alert-error">
          <strong>{d.dashboard.offlineRejected}</strong>
          {offlineResult.rejected.map((r, i) => (
            <div key={i}>
              {r.label}: {r.reason}
            </div>
          ))}
          <button className="btn btn-link" style={{ padding: "0.35rem 0" }} onClick={clearResult}>
            {d.common.close}
          </button>
        </div>
      )}

      {onboarding && !onboarding.complete && !onboarding.dismissed && (
        <Link to="/onboarding" className="alert alert-info" style={{ display: "block", textDecoration: "none" }}>
          <strong>{d.dashboard.notReadyTitle}</strong>{" "}
          {!onboarding.hasObject
            ? d.dashboard.notReadyObject
            : !onboarding.hasEmployee
              ? d.dashboard.notReadyEmployee
              : d.dashboard.notReadyTimeLog}{" "}
          {d.dashboard.tapHere}
        </Link>
      )}

      {user?.role === "admin" && (data.pendingRequests ?? 0) > 0 && (
        <Link to="/admin/requests" className="alert alert-info" style={{ display: "block", textDecoration: "none" }}>
          <strong>
            {d.dashboard.pendingRequests(data.pendingRequests ?? 0)}
          </strong>{" "}
          {d.dashboard.pendingRequestsTail}
        </Link>
      )}

      {activeLog && (backgroundPermission === "prompt" || backgroundPermission === "denied") && (
        <div className="alert alert-info">
          {d.dashboard.backgroundPrompt}
          <button className="btn btn-link" style={{ padding: "0.35rem 0" }} onClick={enableBackgroundTracking}>
            {d.dashboard.enableBackground}
          </button>
        </div>
      )}

      <section className="card">
        {activeLog ? (
          <>
            <h2 className={presence && !presence.inside ? "" : "text-success"}>
              {presence && !presence.inside ? d.dashboard.workdayOpenAway : d.dashboard.clockedIn}
            </h2>
            <p>
              <strong>{d.common.object}:</strong> {activeLog.object.name}
              <br />
              <strong>{d.dashboard.since}:</strong> {new Date(activeLog.startTime).toLocaleString(locale)}
            </p>
          </>
        ) : (
          <>
            <h2>{d.dashboard.noActiveWorkday}</h2>
            {lastFinished && (
              <p>
                <strong>{d.dashboard.lastFinished}</strong>
                <br />
                {d.common.object}: {lastFinished.object.name}
                <br />
                {d.dashboard.started}: {new Date(lastFinished.startTime).toLocaleString(locale)}
                <br />
                {d.dashboard.ended}: {lastFinished.endTime && new Date(lastFinished.endTime).toLocaleString(locale)}
              </p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>{d.dashboard.monthSummary}</h2>
        <dl className="stat-list">
          <div>
            <dt>{d.dashboard.hoursWorked}</dt>
            <dd>{monthSummary.totalHours}</dd>
          </div>
          <div>
            <dt>{d.dashboard.hourlyRate}</dt>
            <dd>€{monthSummary.hourlyRate.toFixed(2)}</dd>
          </div>
          <div>
            <dt>{d.dashboard.earned}</dt>
            <dd>€{monthSummary.totalEarnings.toFixed(2)}</dd>
          </div>
          <div>
            <dt>{d.dashboard.netSalary}</dt>
            <dd>€{monthSummary.netSalary.toFixed(2)}</dd>
          </div>
        </dl>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${monthSummary.progress}%` }} />
        </div>
        <p className="subtitle">
          {d.dashboard.target(monthSummary.monthlyTarget, monthSummary.progress)}
        </p>
      </section>

      <nav className="button-stack">
        {activeLog ? (
          <Link className="btn btn-warning" to="/end-work">
            {d.dashboard.endWork}
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/start-work">
            {d.dashboard.startWork}
          </Link>
        )}
        <Link className="btn btn-secondary" to="/history">
          {d.dashboard.history}
        </Link>
        <Link className="btn btn-secondary" to="/absences">
          {d.dashboard.absences}
        </Link>
        {user?.role === "admin" && (
          <>
            <Link className="btn btn-secondary" to="/admin/objects">
              {d.dashboard.manageObjects}
            </Link>
            <Link className="btn btn-secondary" to="/admin/users">
              {d.dashboard.manageUsers}
            </Link>
            <Link className="btn btn-secondary" to="/admin/requests">
              {d.dashboard.joinRequests}
              {(data.pendingRequests ?? 0) > 0 ? ` (${data.pendingRequests})` : ""}
            </Link>
            <Link className="btn btn-secondary" to="/admin/team-performance">
              {d.dashboard.teamOverview}
            </Link>
            <Link className="btn btn-secondary" to="/admin/settings">
              {d.dashboard.settings}
            </Link>
            <Link className="btn btn-secondary" to="/admin/work-types">
              {d.dashboard.workTypes}
            </Link>
            <Link className="btn btn-secondary" to="/admin/clients">
              {d.dashboard.clients}
            </Link>
            <Link className="btn btn-secondary" to="/admin/reports">
              {d.dashboard.reports}
            </Link>
            <Link className="btn btn-secondary" to="/admin/billing">
              {d.dashboard.billing}
            </Link>
            <Link className="btn btn-secondary" to="/admin/invoices">
              {d.dashboard.invoices}
            </Link>
            <Link className="btn btn-secondary" to="/admin/subscription">
              {d.dashboard.subscription}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
