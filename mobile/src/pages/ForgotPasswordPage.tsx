import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";

export function ForgotPasswordPage() {
  const [orgSlug, setOrgSlug] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { orgSlug: orgSlug.trim().toLowerCase(), email },
        auth: false,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Päringu saatmine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>Kontrolli e-posti</h1>
          {/* Sama tekst ka siis, kui kontot pole — et mitte lekitada, kes
              ettevõttes töötab. */}
          <div className="alert alert-info">
            Kui selline konto on olemas, saatsime taastamise juhised e-postile. Link kehtib ühe tunni.
          </div>
          <Link to="/login" className="btn btn-primary">
            Tagasi sisselogimisse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Unustasid parooli?</h1>
        <p className="subtitle">Saadame taastamise lingi sinu e-postile.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Ettevõtte kood
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saadan..." : "Saada taastamise link"}
        </button>
      </form>
      <Link to="/login" className="btn btn-link" style={{ alignSelf: "center" }}>
        Tagasi sisselogimisse
      </Link>
    </div>
  );
}
