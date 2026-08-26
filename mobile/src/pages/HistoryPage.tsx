import { useEffect, useState } from "react";
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

  useEffect(() => {
    apiRequest<HistoryResponse>("/time-logs")
      .then(setData)
      .catch(() => setError(d.history.loadFailed));
  }, [d]);

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
          <ul className="log-list">
            {data.logs.map((log) => (
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
