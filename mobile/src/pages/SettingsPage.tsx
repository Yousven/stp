import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";

interface Settings {
  check_in_deadline: string;
  check_out_deadline: string;
  tolerance: string;
  admin_email: string;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<Settings>("/settings")
      .then(setSettings)
      .catch(() => setError("Seadete laadimine ebaõnnestus."));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiRequest("/settings", { method: "PUT", body: settings });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvestamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!settings && !error) return <div className="page-loading">Laadin...</div>;

  return (
    <div className="page">
      <h1>Admin seadistused</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-info">Seaded salvestatud.</div>}
      {settings && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Check-in tähtaeg
            <input
              type="time"
              step="1"
              value={settings.check_in_deadline}
              onChange={(e) => setSettings({ ...settings, check_in_deadline: e.target.value })}
              required
            />
          </label>
          <label>
            Check-out tähtaeg
            <input
              type="time"
              step="1"
              value={settings.check_out_deadline}
              onChange={(e) => setSettings({ ...settings, check_out_deadline: e.target.value })}
              required
            />
          </label>
          <label>
            Tolerants (meetrites)
            <input
              type="number"
              value={settings.tolerance}
              onChange={(e) => setSettings({ ...settings, tolerance: e.target.value })}
              required
            />
          </label>
          <label>
            Admin e-posti aadress
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Palun oota..." : "Salvesta seaded"}
          </button>
        </form>
      )}
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        Tagasi Dashboardile
      </button>
    </div>
  );
}
