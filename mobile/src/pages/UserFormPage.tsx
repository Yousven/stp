import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { AdminUser } from "../api/types";
import { useT } from "../i18n";

// Kasutaja loomise/muutmise vorm. Muutmisel jäetakse parool tühjaks, kui
// seda ei taheta uuendada — sama käitumine mis admin_edit_user.php-s.
export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const d = useT();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [advance, setAdvance] = useState("0");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    apiRequest<AdminUser[]>("/users")
      .then((users) => {
        const user = users.find((u) => u.id === Number(id));
        if (!user) {
          setError(d.userForm.notFound);
          return;
        }
        setUsername(user.username);
        setEmail(user.email);
        setHourlyRate(user.hourlyRate);
        setAdvance(user.advance);
        setRole(user.role);
      })
      .catch(() => setError(d.userForm.loadFailed))
      .finally(() => setLoading(false));
  }, [id, isEdit, d]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const body = {
      username,
      email,
      hourlyRate: Number(hourlyRate),
      advance: Number(advance),
      role,
      ...(password ? { password } : {}),
    };
    try {
      if (isEdit) {
        await apiRequest(`/users/${id}`, { method: "PATCH", body });
      } else {
        await apiRequest("/users", { method: "POST", body: { ...body, password } });
      }
      navigate("/admin/users", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      <h1>{isEdit ? d.userForm.titleEdit : d.userForm.titleNew}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          {d.login.username}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          {d.userForm.email}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {isEdit ? d.resetPassword.newPassword : d.login.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} />
        </label>
        <div className="form-hint">{d.passwordPolicy}</div>
        <label>
          {d.userForm.hourlyRate} (€)
          <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
        </label>
        <label>
          {d.userForm.advance} (€)
          <input type="number" step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} required />
        </label>
        <label>
          {d.userForm.role}
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")}>
            <option value="employee">{d.roles.employee}</option>
            <option value="admin">{d.roles.admin}</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? d.common.pleaseWait : d.common.save}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
