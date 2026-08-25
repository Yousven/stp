import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { useT } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";

export function LoginPage() {
  const { login } = useAuth();
  const d = useT();
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
      setError(err instanceof ApiError ? err.message : d.login.failed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>{d.login.appName}</h1>
        <p className="subtitle">{d.login.title}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          {d.login.orgCode}
          <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required autoFocus />
        </label>
        <label>
          {d.login.username}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          {d.login.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <LanguagePicker />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? d.common.pleaseWait : d.login.submit}
        </button>
      </form>
      <Link to="/forgot-password" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.login.forgotPassword}
      </Link>
      <Link to="/join" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.login.joinCompany}
      </Link>
      <Link to="/register" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.login.registerCompany}
      </Link>
    </div>
  );
}
