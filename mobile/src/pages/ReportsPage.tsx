import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, buildDownloadUrl } from "../api/client";
import type { AdminUser, WorkObject } from "../api/types";

export function ReportsPage() {
  const navigate = useNavigate();
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
      <h1>Raportid</h1>
      <div className="card">
        <label>
          Objekt
          <select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
            <option value="">Kõik objektid</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Töötaja
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Kõik töötajad</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kuupäev alates
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          Kuupäev kuni
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div className="button-stack">
          <button className="btn btn-primary" onClick={() => download("excel")}>
            Laadi alla Excel
          </button>
          <button className="btn btn-secondary" onClick={() => download("pdf")}>
            Laadi alla PDF
          </button>
        </div>
      </div>
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        Tagasi Dashboardile
      </button>
    </div>
  );
}
