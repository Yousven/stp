import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useT } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";

interface Settings {
  check_in_deadline: string;
  check_out_deadline: string;
  tolerance: string;
  admin_email: string;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const d = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<Settings>("/settings")
      .then(setSettings)
      .catch(() => setError(d.settings.loadFailed));
  }, [d]);

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
      setError(err instanceof ApiError ? err.message : d.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (!settings && !error) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      <h1>{d.settings.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-info">{d.settings.saved}</div>}
      <div className="card">
        <LanguagePicker />
      </div>
      {settings && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            {d.settings.checkInDeadline}
            <input
              type="time"
              step="1"
              value={settings.check_in_deadline}
              onChange={(e) => setSettings({ ...settings, check_in_deadline: e.target.value })}
              required
            />
          </label>
          <label>
            {d.settings.checkOutDeadline}
            <input
              type="time"
              step="1"
              value={settings.check_out_deadline}
              onChange={(e) => setSettings({ ...settings, check_out_deadline: e.target.value })}
              required
            />
          </label>
          <label>
            {d.settings.tolerance}
            <input
              type="number"
              value={settings.tolerance}
              onChange={(e) => setSettings({ ...settings, tolerance: e.target.value })}
              required
            />
          </label>
          <label>
            {d.settings.adminEmail}
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? d.common.pleaseWait : d.settings.submit}
          </button>
        </form>
      )}
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        {d.common.backToDashboard}
      </button>
    </div>
  );
}
