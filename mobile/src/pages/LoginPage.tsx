import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { useT } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";
import { Icon } from "../components/Icon";

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
        {/* Keelevalik on kõige ülal: kes eesti keelt ei loe, peab saama
            ekraani enda keelde panna enne, kui ta midagi muud proovib. */}
        <LanguagePicker variant="chips" />
        {error && (
          <div className="alert alert-error">
            <Icon name="alert" size={20} />
            <span className="alert-strong">{error}</span>
          </div>
        )}
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
        <button type="submit" className="btn btn-hero btn-primary" disabled={submitting}>
          {submitting ? d.common.pleaseWait : d.login.submit}
        </button>
      </form>
      <Link to="/forgot-password" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.login.forgotPassword}
      </Link>
      {/* Uue töötaja tee ettevõttesse on nupp, mitte üks link kolme seas. */}
      <Link to="/join" className="btn btn-secondary">
        <Icon name="userPlus" size={22} />
        {d.login.joinCompany}
      </Link>
      <Link to="/register" className="btn btn-link" style={{ alignSelf: "center" }}>
        {d.login.registerCompany}
      </Link>
    </div>
  );
}
