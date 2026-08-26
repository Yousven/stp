import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { CompanyDetails } from "../api/types";
import { useT } from "../i18n";

/**
 * Arve väljastaja rekvisiidid.
 *
 * Ilma registrikoodita keeldub server arvet vormistamast — pooleliku
 * rekvisiidiga dokument ei ole Eestis nõuetekohane arve, ja see on parem
 * avastada siin kui pärast kliendile saatmist.
 */
export function CompanyDetailsPage() {
  const navigate = useNavigate();
  const d = useT();
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<CompanyDetails>("/settings/company")
      .then(setDetails)
      .catch(() => setError(d.companyDetails.loadFailed));
  }, [d]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!details) return;
    setError("");
    setSaved(false);
    setSubmitting(true);
    try {
      await apiRequest("/settings/company", {
        method: "PUT",
        body: { ...details, defaultVatRate: Number(details.defaultVatRate) },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.companyDetails.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (!details && !error) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      <h1>{d.companyDetails.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">{d.companyDetails.saved}</div>}

      <p className="subtitle">{d.companyDetails.intro}</p>

      {details && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            {d.companyDetails.name}
            <input
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
              maxLength={255}
              required
            />
          </label>
          <label>
            {d.companyDetails.registryCode}
            <input
              value={details.registryCode ?? ""}
              onChange={(e) => setDetails({ ...details, registryCode: e.target.value })}
              maxLength={40}
              required
            />
          </label>
          <label>
            {d.companyDetails.vatNumber}
            <input
              value={details.vatNumber ?? ""}
              onChange={(e) => setDetails({ ...details, vatNumber: e.target.value })}
              maxLength={40}
            />
          </label>
          <label>
            {d.companyDetails.address}
            <input
              value={details.address ?? ""}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
              maxLength={255}
            />
          </label>
          <label>
            {d.companyDetails.email}
            <input
              type="email"
              value={details.email ?? ""}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
              maxLength={255}
            />
          </label>
          <label>
            {d.companyDetails.phone}
            <input
              value={details.phone ?? ""}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })}
              maxLength={40}
            />
          </label>
          <label>
            {d.companyDetails.iban}
            <input
              value={details.iban ?? ""}
              onChange={(e) => setDetails({ ...details, iban: e.target.value })}
              maxLength={64}
            />
          </label>
          <label>
            {d.companyDetails.defaultVatRate}
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={Number(details.defaultVatRate)}
              onChange={(e) => setDetails({ ...details, defaultVatRate: e.target.value })}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? d.common.saving : d.common.save}
          </button>
        </form>
      )}

      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
