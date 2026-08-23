import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { AdminUser } from "../api/types";

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AdminUser[]>("/users")
      .then(setUsers)
      .catch(() => setError("Kasutajate laadimine ebaõnnestus."));
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <h1>Kasutajad</h1>
        <Link className="btn btn-link" to="/admin/users/new">
          Lisa kasutaja
        </Link>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {!users && !error && <div className="page-loading">Laadin...</div>}
      {users && (
        <ul className="log-list">
          {users.map((user) => (
            <li key={user.id} className="card log-item">
              <strong>
                {user.username} <span className="subtitle">({user.role === "admin" ? "admin" : "töötaja"})</span>
              </strong>
              <div>{user.email}</div>
              <div>Tunnihind: €{Number(user.hourlyRate).toFixed(2)}</div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: "0.5rem" }}
                onClick={() => navigate(`/admin/users/${user.id}/edit`)}
              >
                Muuda
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link className="btn btn-link" to="/dashboard">
        Tagasi Dashboardile
      </Link>
    </div>
  );
}
