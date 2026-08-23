import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { AdminUser } from "../api/types";

// Kasutaja loomise/muutmise vorm. Muutmisel jäetakse parool tühjaks, kui
// seda ei taheta uuendada — sama käitumine mis admin_edit_user.php-s.
export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

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
          setError("Kasutajat ei leitud.");
          return;
        }
        setUsername(user.username);
        setEmail(user.email);
        setHourlyRate(user.hourlyRate);
        setAdvance(user.advance);
        setRole(user.role);
      })
      .catch(() => setError("Kasutaja laadimine ebaõnnestus."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

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
      setError(err instanceof ApiError ? err.message : "Salvestamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Laadin...</div>;

  return (
    <div className="page">
      <h1>{isEdit ? "Muuda kasutajat" : "Lisa kasutaja"}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Kasutajanimi
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {isEdit ? "Uus parool" : "Parool"}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} />
        </label>
        <div className="form-hint">Vähemalt 12 tähemärki, sisaldab numbrit ja sümbolit.</div>
        <label>
          Tunnihind (€)
          <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
        </label>
        <label>
          Avanss (€)
          <input type="number" step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} required />
        </label>
        <label>
          Roll
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")}>
            <option value="employee">Töötaja</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Palun oota..." : "Salvesta"}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
