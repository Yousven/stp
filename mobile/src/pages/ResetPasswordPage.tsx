import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useT } from "../i18n";

export function ResetPasswordPage() {
  const d = useT();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
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
      await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
        auth: false,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.resetPassword.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>{d.resetPassword.invalidTitle}</h1>
          <div className="alert alert-error">
            {d.resetPassword.invalidBody}
          </div>
          <Link to="/forgot-password" className="btn btn-primary">
            {d.resetPassword.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>{d.resetPassword.doneTitle}</h1>
          <div className="alert alert-info">
            {d.resetPassword.doneBody}
          </div>
          <Link to="/login" className="btn btn-primary">
            {d.login.submit}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>{d.resetPassword.title}</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Uus parool
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
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
          {submitting ? d.common.saving : d.resetPassword.submit}
        </button>
      </form>
    </div>
  );
}
