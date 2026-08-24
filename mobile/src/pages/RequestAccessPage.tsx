import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";

interface RequestAccessResponse {
  status: string;
  organization: { name: string; slug: string };
  message: string;
}

/**
 * Isetenindus-liitumine olemasoleva ettevõttega: töötaja loob endale konto ja
 * ettevõtte admin kinnitab selle. Nii ei pea admin paroole käsitsi edastama.
 */
export function RequestAccessPage() {
  const navigate = useNavigate();
  const [orgSlug, setOrgSlug] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<RequestAccessResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Paroolid ei ühti.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<RequestAccessResponse>("/auth/request-access", {
        method: "POST",
        body: { orgSlug: orgSlug.trim().toLowerCase(), username, email, password },
        auth: false,
      });
      setSubmitted(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Taotluse saatmine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>Taotlus saadetud</h1>
          <div className="alert alert-info">{submitted.message}</div>
          <p>
            Ettevõte: <strong>{submitted.organization.name}</strong>
            <br />
            Kasutajanimi: <strong>{username}</strong>
          </p>
          <p className="subtitle">
            Kui administraator on taotluse kinnitanud, saad samade andmetega sisse logida.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/login", { replace: true })}>
            Tagasi sisselogimisse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Liitu ettevõttega</h1>
        <p className="subtitle">Loo endale konto. Ettevõtte administraator peab selle kinnitama.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Ettevõtte kood
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <div className="form-hint">Küsi see kood oma tööandjalt.</div>
        <label>
          Kasutajanimi
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Parool
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <div className="form-hint">Vähemalt 12 tähemärki, sisaldab numbrit ja sümbolit.</div>
        <label>
          Kinnita parool
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saadan..." : "Saada liitumistaotlus"}
        </button>
      </form>
      <Link to="/login" className="btn btn-link" style={{ alignSelf: "center" }}>
        Tagasi sisselogimisse
      </Link>
    </div>
  );
}
