import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";
import { useT } from "../i18n";

export function AdminObjectsPage() {
  const navigate = useNavigate();
  const d = useT();
  const [objects, setObjects] = useState<WorkObject[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setObjects(await apiRequest<WorkObject[]>("/objects/all"));
    } catch {
      setError(d.adminObjects.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(object: WorkObject) {
    setError("");
    try {
      await apiRequest(`/objects/${object.id}/${object.deleted ? "activate" : "deactivate"}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.adminObjects.toggleFailed);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.adminObjects.title}</h1>
        <Link className="btn btn-link" to="/admin/objects/new">
          {d.adminObjects.addObject}
        </Link>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {!objects && !error && <div className="page-loading">{d.common.loading}</div>}
      {objects && (
        <ul className="log-list">
          {objects.map((object) => (
            <li key={object.id} className="card log-item">
              <strong>
                {object.name} {object.deleted && <span className="subtitle">{d.adminObjects.deactivated}</span>}
              </strong>
              {object.address && <div>{object.address}</div>}
              <div className="button-stack" style={{ marginTop: "0.5rem" }}>
                <button className="btn btn-secondary" onClick={() => navigate(`/admin/objects/${object.id}/edit`)}>
                  {d.common.edit}
                </button>
                <button className="btn btn-secondary" onClick={() => toggle(object)}>
                  {object.deleted ? d.adminObjects.activate : d.adminObjects.deactivate}
                </button>
              </div>
            </li>
          ))}
          {objects.length === 0 && <li>{d.adminObjects.none}</li>}
        </ul>
      )}
      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
