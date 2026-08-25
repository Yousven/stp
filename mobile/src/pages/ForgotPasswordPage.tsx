import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useT } from "../i18n";

export function ForgotPasswordPage() {
  const d = useT();
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
      setError(err instanceof ApiError ? err.message : d.forgotPassword.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>{d.forgotPassword.checkEmailTitle}</h1>
          {/* Sama tekst ka siis, kui kontot pole — et mitte lekitada, kes
              ettevõttes töötab. */}
          <div className="alert alert-info">
            {d.forgotPassword.checkEmailBody}
          </div>
          <Link to="/login" className="btn btn-primary">
            {d.requestAccess.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>{d.forgotPassword.title}</h1>
        <p className="subtitle">{d.forgotPassword.intro}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          {d.login.orgCode}
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? d.forgotPassword.sending : d.forgotPassword.submit}
        </button>
      </form>
      <Link to="/login" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.requestAccess.backToLogin}
      </Link>
    </div>
  );
}
