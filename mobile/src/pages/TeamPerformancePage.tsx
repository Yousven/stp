import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useT } from "../i18n";

interface PerformanceRow {
  username: string;
  norm: number;
  actual: number;
  percent: number;
}

interface TeamPerformanceResponse {
  performance: PerformanceRow[];
  totalTeamHours: number;
}

export function TeamPerformancePage() {
  const navigate = useNavigate();
  const d = useT();
  const [data, setData] = useState<TeamPerformanceResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<TeamPerformanceResponse>("/team-performance")
      .then(setData)
      .catch(() => setError(d.common.loadFailed));
  }, [d]);

  return (
    <div className="page">
      <h1>{d.teamPerformance.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="page-loading">{d.common.loading}</div>}
      {data && (
        <>
          <div className="alert alert-info">
            {d.teamPerformance.totalHours} <strong>{data.totalTeamHours}</strong>
          </div>
          <ul className="log-list">
            {data.performance.map((row) => (
              <li key={row.username} className="card log-item">
                <strong>{row.username}</strong>
                <div>
                  {d.teamPerformance.ofHours(row.actual, row.norm)}
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(row.percent, 100)}%` }} />
                </div>
                <div className="subtitle">{row.percent}%</div>
              </li>
            ))}
            {data.performance.length === 0 && <li>{d.teamPerformance.none}</li>}
          </ul>
        </>
      )}
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        {d.common.backToDashboard}
      </button>
    </div>
  );
}
