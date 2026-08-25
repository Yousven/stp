import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";

export function ResetPasswordPage() {
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
      setError("Paroolid ei ühti.");
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
      setError(err instanceof ApiError ? err.message : "Parooli uuendamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>Vigane link</h1>
          <div className="alert alert-error">
            Link ei sisalda taastamise koodi. Palun küsi uus link.
          </div>
          <Link to="/forgot-password" className="btn btn-primary">
            Küsi uus link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page page-center">
        <div className="card">
          <h1>Parool uuendatud</h1>
          <div className="alert alert-info">
            Parool on muudetud ja kõik varasemad sessioonid lõpetatud. Logi uue parooliga sisse.
          </div>
          <Link to="/login" className="btn btn-primary">
            Logi sisse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Sea uus parool</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Uus parool
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
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
          {submitting ? "Salvestan..." : "Salvesta uus parool"}
        </button>
      </form>
    </div>
  );
}
