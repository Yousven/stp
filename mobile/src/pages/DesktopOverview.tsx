import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { ActiveWorker, DashboardResponse, OnboardingState, OrgStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useLocale, useT } from "../i18n";
import { Icon } from "../components/Icon";
import { usePresentMinutes } from "../hooks/useElapsed";

function since(startTime: string, locale: string): string {
  return new Date(startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Arvutiliidese avaleht.
 *
 * Erineb telefoni omast sisuliselt, mitte ainult paigutuselt: telefonis on
 * kasutaja ise see, kes tööd teeb, ja ekraani tähtsaim asi on tema enda
 * tööpäev. Arvutis istub juhataja või raamatupidaja, kelle esimene küsimus
 * on "kes on praegu objektil".
 */
export function DesktopOverview({ data }: { data: DashboardResponse }) {
  const d = useT();
  const locale = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState<OrgStatus | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<OrgStatus>("/me/org-status")
      .then(setStatus)
      .catch(() => setStatus(null));
    apiRequest<OnboardingState>("/me/onboarding")
      .then(setOnboarding)
      .catch(() => setOnboarding(null));
  }, [isAdmin]);

  const { monthSummary } = data;

  return (
    <div className="page">
      <header>
        <h1>{d.desktop.overview}</h1>
        <p className="subtitle">{d.desktop.welcome(user?.username ?? "")}</p>
      </header>

      {onboarding && !onboarding.complete && !onboarding.dismissed && (
        <Link to="/onboarding" className="alert alert-info" style={{ textDecoration: "none" }}>
          <Icon name="info" size={20} />
          <span className="alert-strong">
            <strong>{d.dashboard.notReadyTitle}</strong>{" "}
            {!onboarding.hasObject
              ? d.dashboard.notReadyObject
              : !onboarding.hasEmployee
                ? d.dashboard.notReadyEmployee
                : d.dashboard.notReadyTimeLog}
          </span>
        </Link>
      )}

      {isAdmin && (status?.pendingRequests ?? 0) > 0 && (
        <Link to="/admin/requests" className="alert alert-info" style={{ textDecoration: "none" }}>
          <Icon name="userPlus" size={20} />
          <span className="alert-strong">
            <strong>{d.dashboard.pendingRequests(status!.pendingRequests)}</strong>{" "}
            {d.dashboard.pendingRequestsTail}
          </span>
        </Link>
      )}

      {isAdmin && (
        <section className="card">
          <h2>{d.desktop.activeNow}</h2>
          {status === null ? (
            <p className="subtitle">{d.common.loading}</p>
          ) : status.active.length === 0 ? (
            <div className="empty-state">
              <Icon name="inbox" size={40} />
              <p>{d.desktop.activeNowNone}</p>
            </div>
          ) : (
            <>
              <p className="subtitle">
                {d.desktop.peopleWorking(status.active.length)}
                {" · "}
                {d.desktop.onSiteCount(status.active.filter((w) => w.onSite).length)}
              </p>
              <ul className="log-list">
                {status.active.map((worker) => (
                  <ActiveWorkerRow key={worker.logId} worker={worker} locale={locale} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="card-columns">
        <section className="card">
          <h2>{d.dashboard.monthSummary}</h2>
          <dl className="stat-list" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
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
          <p className="subtitle" style={{ margin: 0 }}>
            {d.dashboard.target(monthSummary.monthlyTarget, monthSummary.progress)}
          </p>
        </section>

        {/* Miks siin "Alusta tööpäeva" nuppu ei ole — vastus enne küsimist,
            muidu tundub see puuduva funktsioonina. */}
        <section className="card">
          <h2>{d.desktop.phoneOnly}</h2>
          <p className="subtitle" style={{ margin: 0 }}>
            {d.desktop.phoneOnlyBody}
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * Üks praegu töötav inimene.
 *
 * Paremas ääres on kulunud aeg, mitte alustamise kellaaeg: juhataja
 * küsimus on "kaua ta juba teeb", ja kellaaeg üksi nõuaks peast lahutamist.
 * Algusaeg jääb kõrvalreale alles, sest seda on vaja kontrollimiseks.
 */
function ActiveWorkerRow({ worker, locale }: { worker: ActiveWorker; locale: string }) {
  const d = useT();
  // Kohal oldud aeg, mitte aeg tööpäeva algusest: viimane sisaldaks ka
  // vahepeal eemal käidud tunde ja näitaks suuremat numbrit kui see, mille
  // eest palka makstakse.
  const minutes =
    usePresentMinutes({
      onSite: worker.onSite,
      since: worker.presenceSince,
      lastEventAt: worker.lastPresenceAt,
      presentMsBefore: worker.presentMsBefore,
    }) ?? 0;

  return (
    <li className="log-item">
      <div className="log-row">
        <div>
          <strong>{worker.username}</strong>
          <div className="subtitle" style={{ margin: 0 }}>
            {worker.objectName}
            {worker.workTypeName ? ` · ${worker.workTypeName}` : ""} · {d.dashboard.since}{" "}
            {since(worker.startTime, locale)}
          </div>
        </div>
        {/* Number on alati näha, ka eemal olija juures — juhataja tahab
            teada, kui palju keegi täna teinud on. Eemal olles see number
            seisab: varem kerkis see kohalolekust sõltumata edasi ja eelmisel
            päeval lahkunu juures seisis hommikul "22 h", just see number,
            mille pärast kogu arvestust ei saanud usaldada. */}
        <div className={`log-hours${worker.onSite ? "" : " text-warning"}`}>
          {!worker.onSite && <Icon name="pin" size={18} />}{" "}
          {d.dashboard.duration(Math.floor(minutes / 60), minutes % 60)}
        </div>
      </div>
      {!worker.onSite && (
        <div className="text-warning">{d.desktop.offSiteSince(since(worker.presenceSince, locale))}</div>
      )}
      {/* Lahti ununenud päev vajab admini sekkumist — töötaja ise ei pruugi
          seda enam märgata, sest tema ekraanil kell ei jookse. */}
      {worker.openLimitReached && (
        <div className="alert alert-error" style={{ marginTop: "0.5rem" }}>
          <Icon name="clock" size={18} /> {d.desktop.forgottenOpen}
        </div>
      )}
      {/* Võltsitud asukoht ei blokeeri tööpäeva, aga admin peab seda nägema —
          muidu ei tea keegi seda kontrollida. */}
      {worker.locationMocked && <div className="text-warning">{d.reports.suspicious}</div>}
      {worker.createdOffline && (
        <div className="subtitle" style={{ margin: 0 }}>
          {d.reports.offlineEntry}
        </div>
      )}
    </li>
  );
}
