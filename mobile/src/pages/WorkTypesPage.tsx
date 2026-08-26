import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkType } from "../api/types";
import { useT } from "../i18n";

interface Draft {
  id: number | null;
  name: string;
  code: string;
  defaultRate: string;
}

const EMPTY: Draft = { id: null, name: "", code: "", defaultRate: "" };

/**
 * Ettevõtte tööliikide nimekiri.
 *
 * Siin määratakse ainult see, MIS tööliigid ettevõttel üldse on. Kus neid
 * tehakse ja mis hinnaga — see käib objekti juures, sest sama töö maksab
 * eri tellijale erinevalt.
 */
export function WorkTypesPage() {
  const d = useT();
  const [types, setTypes] = useState<WorkType[] | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setTypes(await apiRequest<WorkType[]>("/work-types"));
    } catch {
      setError(d.workTypes.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setFormError("");
    setSubmitting(true);
    try {
      const body = {
        name: draft.name.trim(),
        code: draft.code.trim() === "" ? null : draft.code.trim(),
        // Tühi väli tähendab "määramata", mitte nulli: null hoiab tunnid
        // arvelduses eraldi väljas, 0 loeks need tasuta tehtuks.
        defaultRate: draft.defaultRate.trim() === "" ? null : Number(draft.defaultRate),
      };
      if (draft.id === null) {
        await apiRequest("/work-types", { method: "POST", body });
      } else {
        await apiRequest(`/work-types/${draft.id}`, { method: "PATCH", body });
      }
      setDraft(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : d.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(type: WorkType) {
    if (!confirm(d.workTypes.confirmRemove(type.name))) return;
    try {
      await apiRequest(`/work-types/${type.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.workTypes.removeFailed);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.workTypes.title}</h1>
        <button className="btn btn-link" onClick={() => setDraft(draft ? null : { ...EMPTY })}>
          {draft ? d.common.cancel : d.common.add}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="subtitle">{d.workTypes.intro}</p>

      {draft && (
        <form className="card" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <label>
            {d.workTypes.name}
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={d.workTypes.namePlaceholder}
              maxLength={255}
              required
              autoFocus
            />
          </label>
          <label>
            {d.workTypes.code} <span className="subtitle">({d.common.optional})</span>
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              maxLength={40}
            />
          </label>
          <div className="form-hint">{d.workTypes.codeHint}</div>
          <label>
            {d.workTypes.defaultRate}
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.defaultRate}
              onChange={(e) => setDraft({ ...draft, defaultRate: e.target.value })}
              placeholder={d.workTypes.ratePlaceholder}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? d.common.saving : draft.id === null ? d.workTypes.submitNew : d.common.save}
          </button>
        </form>
      )}

      {!types && !error && <div className="page-loading">{d.common.loading}</div>}

      {types && types.length === 0 && !draft && (
        <div className="card">
          <p>{d.workTypes.none}</p>
        </div>
      )}

      {types && types.length > 0 && (
        <ul className="log-list">
          {types.map((t) => (
            <li key={t.id} className="card log-item">
              <strong>{t.name}</strong>
              {t.code && <div className="subtitle">{t.code}</div>}
              <div>
                {t.defaultRate === null ? (
                  <span className="text-warning">{d.workTypes.rateUndefined}</span>
                ) : (
                  <>{d.workTypes.rateValue(Number(t.defaultRate).toFixed(2))}</>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setDraft({
                      id: t.id,
                      name: t.name,
                      code: t.code ?? "",
                      defaultRate: t.defaultRate === null ? "" : String(Number(t.defaultRate)),
                    })
                  }
                >
                  {d.common.edit}
                </button>
                <button className="btn btn-secondary" onClick={() => handleRemove(t)}>
                  {d.common.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
