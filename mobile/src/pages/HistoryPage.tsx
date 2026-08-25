import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { HistoryResponse } from "../api/types";
import { useLocale, useT } from "../i18n";

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
            {d.history.total(data.totalHours)}
          </div>
          <ul className="log-list">
            {data.logs.map((log) => (
              <li key={log.id} className="card log-item">
                <strong>{log.object.name}</strong>
                <div>{new Date(log.startTime).toLocaleString(locale)}</div>
                <div>{log.endTime ? new Date(log.endTime).toLocaleString(locale) : d.history.active}</div>
                <div>{log.durationHours != null ? `${log.durationHours} h` : "—"}</div>
                {log.awayHours != null && log.awayHours > 0 && (
                  <div className="subtitle">{d.history.awayFromSite(log.awayHours)}</div>
                )}
                {log.comment && <div className="log-comment">{log.comment}</div>}
              </li>
            ))}
            {data.logs.length === 0 && <li>{d.history.none}</li>}
          </ul>
        </>
      )}
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
