import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { HistoryResponse } from "../api/types";

export function HistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<HistoryResponse>("/time-logs")
      .then(setData)
      .catch(() => setError("Tööajaloo laadimine ebaõnnestus."));
  }, []);

  return (
    <div className="page">
      <h1>Tööajalugu</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="page-loading">Laadin...</div>}
      {data && (
        <>
          <div className="alert alert-info">
            Kokku: <strong>{data.totalHours}</strong> tundi
          </div>
          <ul className="log-list">
            {data.logs.map((log) => (
              <li key={log.id} className="card log-item">
                <strong>{log.object.name}</strong>
                <div>{new Date(log.startTime).toLocaleString("et-EE")}</div>
                <div>{log.endTime ? new Date(log.endTime).toLocaleString("et-EE") : "Aktiivne"}</div>
                <div>{log.durationHours != null ? `${log.durationHours} h` : "—"}</div>
                {log.awayHours != null && log.awayHours > 0 && (
                  <div className="subtitle">Objektilt eemal: {log.awayHours} h</div>
                )}
                {log.comment && <div className="log-comment">{log.comment}</div>}
              </li>
            ))}
            {data.logs.length === 0 && <li>Ühtegi tööaja kirjet ei leitud.</li>}
          </ul>
        </>
      )}
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
