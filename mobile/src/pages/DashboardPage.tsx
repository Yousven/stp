import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
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

  /**
   * Kulunud aja näit peab jooksma ka lahtise ekraani peal. Ilma selleta
   * näitaks see avamise hetke ja jääks vaikselt valeks — töötaja, kes
   * kontrollib "kaua ma juba teinud olen", saaks vale vastuse.
   */
  const [nowTick, setNowTick] = useState(() => Date.now());
  const workdayRunning = Boolean(data?.activeLog ?? offlineLog);
  useEffect(() => {
    // Taimer käib ainult siis, kui on midagi lugeda. Lõpetatud tööpäeva
    // kohal tiksuv intervall ärataks protsessorit asjata.
    if (!workdayRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [workdayRunning]);

  function elapsedSince(startTime: string): string {
    const minutes = Math.max(Math.floor((nowTick - new Date(startTime).getTime()) / 60_000), 0);
    return d.dashboard.duration(Math.floor(minutes / 60), minutes % 60);
  }

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
          <Icon name="info" size={20} />
          <span className="alert-strong">{d.dashboard.offlineNotice}</span>
        </div>
        {offlineLog ? (
          <section className="status-card status-card--active">
            <div className="status-head">
              <span className="pulse-dot" />
              {d.dashboard.workdayRunning}
            </div>
            <div className="big-timer">{elapsedSince(offlineLog.startTime)}</div>
            <div className="status-meta">
              <span>
                <strong>{offlineLog.objectName}</strong>
              </span>
              <span>
                {d.dashboard.since} {new Date(offlineLog.startTime).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </section>
        ) : (
          <section className="status-card">
            <div className="status-head">{d.dashboard.noActiveWorkday}</div>
          </section>
        )}
        <nav className="button-stack">
          {offlineLog ? (
            <Link className="btn btn-hero btn-warning" to="/end-work">
              <Icon name="stop" size={26} filled />
              {d.dashboard.endWork}
            </Link>
          ) : (
            <Link className="btn btn-hero btn-primary" to="/start-work">
              <Icon name="play" size={26} filled />
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
        <button className="btn btn-link" onClick={() => logout()} aria-label={d.login.logout}>
          <Icon name="logout" size={22} />
        </button>
      </header>

      {activeLog && presence && !presence.inside && (
        <div className="alert alert-error">
          <Icon name="pin" size={20} />
          <span className="alert-strong">{d.dashboard.awayFromSite(presence.distanceMeters)}</span>
        </div>
      )}

      {offlinePending > 0 && (
        <div className="alert alert-info">
          <Icon name="info" size={20} />
          <span className="alert-strong">{d.dashboard.offlinePending(offlinePending)}</span>
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

      {/* Olek on ekraani kõige olulisem asi: kas kell käib või mitte. Värv
          ja suur number annavad selle edasi ka teksti lugemata. */}
      {activeLog ? (
        <section
          className={`status-card ${presence && !presence.inside ? "status-card--away" : "status-card--active"}`}
        >
          <div className="status-head">
            {presence && !presence.inside ? <Icon name="pin" size={22} /> : <span className="pulse-dot" />}
            {presence && !presence.inside ? d.dashboard.awayShort : d.dashboard.workdayRunning}
          </div>
          <div className="big-timer">{elapsedSince(activeLog.startTime)}</div>
          <div className="status-meta">
            <span>
              <strong>{activeLog.object.name}</strong>
            </span>
            <span>
              {d.dashboard.since}{" "}
              {new Date(activeLog.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </section>
      ) : (
        <section className="status-card">
          <div className="status-head">
            <Icon name="clock" size={22} />
            {d.dashboard.noActiveWorkday}
          </div>
          {lastFinished && (
            <div className="status-meta">
              <span>{d.dashboard.lastFinished}</span>
              <span>
                <strong>{lastFinished.object.name}</strong>
              </span>
              <span>
                {new Date(lastFinished.startTime).toLocaleDateString(locale)}{" "}
                {new Date(lastFinished.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                {lastFinished.endTime &&
                  ` – ${new Date(lastFinished.endTime).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </span>
            </div>
          )}
        </section>
      )}

      {/* Põhitegevus tuleb kohe oleku järel, mitte kuu kokkuvõtte taga:
          äpp avatakse selleks, et kella käima panna või kinni panna. */}
      <nav className="button-stack">
        {activeLog ? (
          <Link className="btn btn-hero btn-warning" to="/end-work">
            <Icon name="stop" size={26} filled />
            {d.dashboard.endWork}
          </Link>
        ) : (
          <Link className="btn btn-hero btn-primary" to="/start-work">
            <Icon name="play" size={26} filled />
            {d.dashboard.startWork}
          </Link>
        )}
      </nav>

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

      {/* Igapäevased asjad paanidena: ikoon + lühike nimi loeb kiiremini
          kui ühesuguste nuppude virn. */}
      <p className="section-label">{d.dashboard.everydaySection}</p>
      <nav className="tile-grid">
        <Link className="tile" to="/history">
          <Icon name="history" size={26} className="tile-icon" />
          {d.dashboard.history}
        </Link>
        <Link className="tile" to="/absences">
          <Icon name="calendar" size={26} className="tile-icon" />
          {d.dashboard.absences}
        </Link>
      </nav>

      {/*
        Haldus on eraldi rühmas ja allpool. Objektil olev töötaja ei pea
        kunagi siia jõudma; admin leiab selle ühest kohast, mitte laiali
        pillutatuna igapäevaste nuppude vahelt.
      */}
      {user?.role === "admin" && (
        <>
          <p className="section-label">{d.dashboard.adminSection}</p>
          <nav className="tile-grid">
            <Link className="tile" to="/admin/objects">
              <Icon name="building" size={26} className="tile-icon" />
              {d.dashboard.manageObjects}
            </Link>
            <Link className="tile" to="/admin/users">
              <Icon name="users" size={26} className="tile-icon" />
              {d.dashboard.manageUsers}
            </Link>
            <Link
              className={`tile ${(data.pendingRequests ?? 0) > 0 ? "tile--attention" : ""}`}
              to="/admin/requests"
            >
              <Icon name="userPlus" size={26} className="tile-icon" />
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {d.dashboard.joinRequests}
                {(data.pendingRequests ?? 0) > 0 && <span className="badge">{data.pendingRequests}</span>}
              </span>
            </Link>
            <Link className="tile" to="/admin/team-performance">
              <Icon name="chart" size={26} className="tile-icon" />
              {d.dashboard.teamOverview}
            </Link>
            <Link className="tile" to="/admin/work-types">
              <Icon name="tag" size={26} className="tile-icon" />
              {d.dashboard.workTypes}
            </Link>
            <Link className="tile" to="/admin/clients">
              <Icon name="briefcase" size={26} className="tile-icon" />
              {d.dashboard.clients}
            </Link>
            <Link className="tile" to="/admin/billing">
              <Icon name="euro" size={26} className="tile-icon" />
              {d.dashboard.billing}
            </Link>
            <Link className="tile" to="/admin/invoices">
              <Icon name="invoice" size={26} className="tile-icon" />
              {d.dashboard.invoices}
            </Link>
            <Link className="tile" to="/admin/reports">
              <Icon name="report" size={26} className="tile-icon" />
              {d.dashboard.reports}
            </Link>
            <Link className="tile" to="/admin/settings">
              <Icon name="settings" size={26} className="tile-icon" />
              {d.dashboard.settings}
            </Link>
            <Link className="tile" to="/admin/subscription">
              <Icon name="card" size={26} className="tile-icon" />
              {d.dashboard.subscription}
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
