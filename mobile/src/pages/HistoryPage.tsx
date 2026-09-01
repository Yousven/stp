import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { HistoryResponse, TimeLog } from "../api/types";
import { useLocale, useT } from "../i18n";
import { Icon } from "../components/Icon";

/** Nädala algus (esmaspäev) kohalikus ajas — Eestis algab nädal E-ga. */
function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay() || 7; // pühapäev 0 -> 7
  start.setDate(start.getDate() - (day - 1));
  return start;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface WeekGroup {
  key: string;
  label: string;
  hours: number;
  dayCount: number;
  logs: TimeLog[];
}

export function HistoryPage() {
  const navigate = useNavigate();
  const d = useT();
  const locale = useLocale();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [objectFilter, setObjectFilter] = useState<string>("");
  const [openKeys, setOpenKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    apiRequest<HistoryResponse>("/time-logs")
      .then(setData)
      .catch(() => setError(d.history.loadFailed));
  }, [d]);

  // Objektide nimekiri filtri jaoks tuleb kirjetest endist: nii ei paku me
  // valikuid, millel ühtegi tundi taga ei ole.
  const objects = useMemo(() => {
    const byId = new Map<number, string>();
    for (const log of data?.logs ?? []) byId.set(log.object.id, log.object.name);
    return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const visibleLogs = useMemo(() => {
    const logs = data?.logs ?? [];
    if (!objectFilter) return logs;
    return logs.filter((log) => String(log.object.id) === objectFilter);
  }, [data, objectFilter]);

  /**
   * Kirjed nädalate kaupa.
   *
   * Kuu oli liiga jäme samm: 20+ rida ühe päise all tähendas, et töötaja ei
   * leidnud sealt oma nädalat üles. Nädal on ka see samm, mille kaupa tööd
   * objektil planeeritakse, seega "kui palju ma sel nädalal tegin" on päris
   * küsimus, mida siit otsitakse.
   */
  const weeks = useMemo(() => {
    const now = new Date();
    const currentWeek = weekStart(now);
    const previousWeek = new Date(currentWeek);
    previousWeek.setDate(previousWeek.getDate() - 7);

    const groups = new Map<string, WeekGroup>();
    const daysSeen = new Map<string, Set<string>>();

    for (const log of visibleLogs) {
      const started = new Date(log.startTime);
      const start = weekStart(started);
      const key = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      let label: string;
      if (sameDay(start, currentWeek)) label = d.history.thisWeek;
      else if (sameDay(start, previousWeek)) label = d.history.lastWeek;
      else {
        const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
        label = `${start.toLocaleDateString(locale, fmt)} – ${end.toLocaleDateString(locale, fmt)}`;
      }

      const group = groups.get(key) ?? { key, label, hours: 0, dayCount: 0, logs: [] };
      group.logs.push(log);
      group.hours += log.durationHours ?? 0;
      groups.set(key, group);

      const days = daysSeen.get(key) ?? new Set<string>();
      days.add(started.toDateString());
      daysSeen.set(key, days);
    }

    return [...groups.values()].map((g) => ({
      ...g,
      hours: Math.round(g.hours * 100) / 100,
      dayCount: daysSeen.get(g.key)?.size ?? 0,
    }));
  }, [visibleLogs, locale, d]);

  // Vaikimisi on jooksev nädal lahti ja vanemad kinni — muidu tuleks kuude
  // jagu ridu läbi kerida. Kasutaja valik kirjutab selle üle.
  const effectiveOpen = openKeys ?? new Set(weeks.slice(0, 1).map((w) => w.key));

  function toggle(key: string) {
    const next = new Set(effectiveOpen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenKeys(next);
  }

  const filteredTotal = Math.round(visibleLogs.reduce((sum, l) => sum + (l.durationHours ?? 0), 0) * 100) / 100;

  return (
    <div className="page">
      <h1>{d.history.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="page-loading">{d.common.loading}</div>}
      {data && (
        <>
          <div className="alert alert-info">
            <Icon name="clock" size={20} />
            <span className="alert-strong">{d.history.total(objectFilter ? filteredTotal : data.totalHours)}</span>
          </div>

          {/* Filter ilmub alles siis, kui valida on midagi — ühe objektiga
              töötajale oleks see ainult üleliigne juhtnupp ekraanil. */}
          {objects.length > 1 && (
            <label className="history-filter">
              {d.history.filterObject}
              <select value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)}>
                <option value="">{d.history.allObjects}</option>
                {objects.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {weeks.length === 0 && <p className="subtitle">{d.history.none}</p>}

          {weeks.map((week) => {
            const isOpen = effectiveOpen.has(week.key);
            return (
              <div key={week.key} className="month-group">
                <button type="button" className="month-header" onClick={() => toggle(week.key)} aria-expanded={isOpen}>
                  <span>
                    {week.label}
                    <span className="subtitle" style={{ display: "block", margin: 0 }}>
                      {d.history.days(week.dayCount)}
                    </span>
                  </span>
                  <span className="log-hours">{d.history.weekHours(week.hours)}</span>
                </button>

                {isOpen && (
                  <ul className="log-list">
                    {week.logs.map((log) => (
                      <li key={log.id} className="card log-item">
                        {/* Kuupäev ja tunnid ühel real: nii saab nimekirja silmadega
                            mööda paremat serva läbi käia, ilma iga kirjet lugemata. */}
                        <div className="log-row">
                          <div>
                            <strong>
                              {new Date(log.startTime).toLocaleDateString(locale, {
                                weekday: "short",
                                day: "numeric",
                                month: "numeric",
                              })}
                            </strong>
                            <div className="subtitle" style={{ margin: 0 }}>
                              {log.object.name}
                            </div>
                          </div>
                          <div className="log-hours">{log.durationHours != null ? `${log.durationHours} h` : "—"}</div>
                        </div>
                        <div className="subtitle" style={{ margin: 0 }}>
                          {new Date(log.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {log.endTime
                            ? new Date(log.endTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
                            : d.history.active}
                        </div>
                        {log.implausibleLength && (
                          <div className="text-warning">{d.reports.implausibleLength}</div>
                        )}
                        {log.awayHours != null && log.awayHours > 0 && (
                          <div className="text-warning">{d.history.awayFromSite(log.awayHours)}</div>
                        )}
                        {log.comment && <div className="log-comment">{log.comment}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}
      <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
        {d.common.back}
      </button>
    </div>
  );
}
