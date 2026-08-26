import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { HistoryResponse } from "../api/types";
import { useLocale, useT } from "../i18n";
import { Icon } from "../components/Icon";

export function HistoryPage() {
  const navigate = useNavigate();
  const d = useT();
  const locale = useLocale();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiRequest<HistoryResponse>("/time-logs")
      .then(setData)
      .catch(() => setError(d.history.loadFailed));
  }, [d]);

  /**
   * Kirjed kuude kaupa.
   *
   * Ühe pika nimekirjana ei leia töötaja sealt midagi: kuu tunnid on see,
   * mille järgi palka makstakse, ja just seda tullakse kontrollima. Kuu
   * summa on päises kohe näha, ilma et peaks ridu kokku liitma.
   */
  const months = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; hours: number; logs: HistoryResponse["logs"] }>();

    for (const log of data?.logs ?? []) {
      const started = new Date(log.startTime);
      const key = `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, "0")}`;
      const group = groups.get(key) ?? {
        key,
        label: new Date(started.getFullYear(), started.getMonth(), 1).toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        }),
        hours: 0,
        logs: [],
      };
      group.logs.push(log);
      group.hours += log.durationHours ?? 0;
      groups.set(key, group);
    }

    return [...groups.values()].map((g) => ({ ...g, hours: Math.round(g.hours * 100) / 100 }));
  }, [data, locale]);

  function toggle(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="page">
      <h1>{d.history.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="page-loading">{d.common.loading}</div>}
      {data && (
        <>
          <div className="alert alert-info">
            <Icon name="clock" size={20} />
            <span className="alert-strong">{d.history.total(data.totalHours)}</span>
          </div>
          {months.map((month, index) => {
            // Jooksev kuu on lahti, vanemad kokku volditud — muidu tuleks
            // aasta jagu ridu läbi kerida, et eelmise kuuni jõuda.
            const isOpen = index === 0 ? !collapsed.has(month.key) : collapsed.has(month.key);
            return (
              <div key={month.key} className="month-group">
                <button
                  type="button"
                  className="month-header"
                  onClick={() => toggle(month.key)}
                  aria-expanded={isOpen}
                >
                  <span style={{ textTransform: "capitalize" }}>{month.label}</span>
                  <span className="log-hours">
                    {month.hours} {d.common.hoursShort}
                  </span>
                </button>

                {isOpen && (
                  <ul className="log-list">
                    {month.logs.map((log) => (
                      <li key={log.id} className="card log-item">
                        {/* Kuupäev ja tunnid ühel real: nii saab nimekirja silmadega
                            mööda paremat serva läbi käia, ilma iga kirjet lugemata. */}
                        <div className="log-row">
                          <div>
                            <strong>{new Date(log.startTime).toLocaleDateString(locale)}</strong>
                            <div className="subtitle" style={{ margin: 0 }}>
                              {log.object.name}
                            </div>
                          </div>
                          <div className="log-hours">
                            {log.durationHours != null ? `${log.durationHours} h` : "—"}
                          </div>
                        </div>
                        <div className="subtitle" style={{ margin: 0 }}>
                          {new Date(log.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {log.endTime
                            ? new Date(log.endTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
                            : d.history.active}
                        </div>
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
          {data.logs.length === 0 && (
            <div className="card empty-state">
              <Icon name="inbox" size={44} />
              <p>{d.history.none}</p>
            </div>
          )}
        </>
      )}
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
