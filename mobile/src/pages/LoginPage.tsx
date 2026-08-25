import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [orgSlug, setOrgSlug] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(orgSlug, username, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sisselogimine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>SmartTimePlanning</h1>
        <p className="subtitle">Logi sisse</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Ettevõtte kood
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <label>
          Kasutajanimi
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Parool
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Palun oota..." : "Logi sisse"}
        </button>
      </form>
      <Link to="/forgot-password" className="btn btn-link" style={{ alignSelf: "center" }}>
        Unustasid parooli?
      </Link>
      <Link to="/join" className="btn btn-link" style={{ alignSelf: "center" }}>
        Liitu ettevõttega
      </Link>
      <Link to="/register" className="btn btn-link" style={{ alignSelf: "center" }}>
        Registreeri oma ettevõte
      </Link>
    </div>
  );
}
