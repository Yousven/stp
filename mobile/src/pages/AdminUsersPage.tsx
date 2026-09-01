import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { AdminUser } from "../api/types";
import { useT } from "../i18n";
import { OrgCodeCard } from "../components/OrgCodeCard";

export function AdminUsersPage() {
  const navigate = useNavigate();
  const d = useT();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AdminUser[]>("/users")
      .then(setUsers)
      .catch(() => setError(d.adminUsers.loadFailed));
  }, [d]);

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.adminUsers.title}</h1>
        <Link className="btn btn-link" to="/admin/users/new">
          {d.adminUsers.addUser}
        </Link>
      </header>
      {/* Kood on siin, mitte ainult seadistusjuhises: uue töötaja lisamise
          hetkel on see täpselt see asi, mida otsitakse. */}
      <OrgCodeCard />
      {error && <div className="alert alert-error">{error}</div>}
      {!users && !error && <div className="page-loading">{d.common.loading}</div>}
      {users && (
        <ul className="log-list">
          {users.map((user) => (
            <li key={user.id} className="card log-item">
              <strong>
                {user.username}{" "}
                <span className="subtitle">({user.role === "admin" ? d.roles.admin : d.roles.employee})</span>
              </strong>
              <div>{user.email}</div>
              <div>{d.adminUsers.hourlyRate(Number(user.hourlyRate).toFixed(2))}</div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: "0.5rem" }}
                onClick={() => navigate(`/admin/users/${user.id}/edit`)}
              >
                {d.common.edit}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
