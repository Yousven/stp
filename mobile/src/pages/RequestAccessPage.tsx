import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useT } from "../i18n";

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
  const d = useT();
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
      setError(d.passwordsDoNotMatch);
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
      setError(err instanceof ApiError ? err.message : d.requestAccess.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>{d.requestAccess.sentTitle}</h1>
          <div className="alert alert-info">{submitted.message}</div>
          <p>
            {d.requestAccess.company} <strong>{submitted.organization.name}</strong>
            <br />
            {d.requestAccess.usernameLabel} <strong>{username}</strong>
          </p>
          <p className="subtitle">
            {d.requestAccess.afterApproval}
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/login", { replace: true })}>
            {d.requestAccess.backToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>{d.requestAccess.title}</h1>
        <p className="subtitle">{d.requestAccess.intro}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          {d.login.orgCode}
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <div className="form-hint">{d.requestAccess.orgCodeHint}</div>
        <label>
          {d.login.username}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          {d.userForm.email}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {d.login.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <div className="form-hint">{d.passwordPolicy}</div>
        <label>
          {d.confirmPassword}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? d.requestAccess.sending : d.requestAccess.submit}
        </button>
      </form>
      <Link to="/login" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.requestAccess.backToLogin}
      </Link>
    </div>
  );
}
