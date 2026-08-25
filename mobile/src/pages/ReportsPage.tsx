import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, buildDownloadUrl } from "../api/client";
import type { AdminUser, WorkObject } from "../api/types";
import { useT } from "../i18n";

export function ReportsPage() {
  const navigate = useNavigate();
  const d = useT();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [objectId, setObjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    apiRequest<WorkObject[]>("/objects/all").then(setObjects).catch(() => undefined);
    apiRequest<AdminUser[]>("/users").then(setUsers).catch(() => undefined);
  }, []);

  async function download(format: "excel" | "pdf") {
    const url = await buildDownloadUrl(`/reports/${format}`, { objectId, userId, dateFrom, dateTo });
    window.open(url, "_blank");
  }

  return (
    <div className="page">
      <h1>{d.reports.title}</h1>
      <div className="card">
        <label>
          {d.common.object}
          <select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
            <option value="">{d.common.allObjects}</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {d.reports.worker}
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{d.reports.allWorkers}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          {d.reports.dateFrom}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {d.reports.dateTo}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div className="button-stack">
          <button className="btn btn-primary" onClick={() => download("excel")}>
            {d.reports.downloadExcel}
          </button>
          <button className="btn btn-secondary" onClick={() => download("pdf")}>
            {d.reports.downloadPdf}
          </button>
        </div>
      </div>
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        {d.common.backToDashboard}
      </button>
    </div>
  );
}
