import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { CostCode, WorkObject } from "../api/types";
import { useT } from "../i18n";

interface Draft {
  id: number | null;
  code: string;
  name: string;
  objectId: number | "";
  billableRate: string;
}

const EMPTY: Draft = { id: null, code: "", name: "", objectId: "", billableRate: "" };

export function CostCodesPage() {
  const d = useT();
  const [codes, setCodes] = useState<CostCode[] | null>(null);
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCodes(await apiRequest<CostCode[]>("/cost-codes"));
    } catch {
      setError(d.costCodes.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
    apiRequest<WorkObject[]>("/objects")
      .then(setObjects)
      .catch(() => {
        /* objektide loend on abiinfo — ilma selleta saab üldist koodi ikka lisada */
      });
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setFormError("");
    setSubmitting(true);
    try {
      const body = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        objectId: draft.objectId === "" ? null : draft.objectId,
        // Tühi väli tähendab "määramata", mitte nulli: null hoiab tunnid
        // arveldusraportis eraldi välja, 0 loeks need tasuta tehtuks.
        billableRate: draft.billableRate.trim() === "" ? null : Number(draft.billableRate),
      };
      if (draft.id === null) {
        await apiRequest("/cost-codes", { method: "POST", body });
      } else {
        await apiRequest(`/cost-codes/${draft.id}`, { method: "PATCH", body });
      }
      setDraft(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : d.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(code: CostCode) {
    if (!confirm(d.costCodes.confirmRemove(code.code))) return;
    try {
      await apiRequest(`/cost-codes/${code.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.costCodes.removeFailed);
    }
  }

  function objectName(objectId: number | null): string {
    if (objectId === null) return d.common.allObjects;
    return objects.find((o) => o.id === objectId)?.name ?? `#${objectId}`;
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.costCodes.title}</h1>
        <button className="btn btn-link" onClick={() => setDraft(draft ? null : { ...EMPTY })}>
          {draft ? d.common.cancel : d.common.add}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="subtitle">
        {d.costCodes.intro}
      </p>

      {draft && (
        <form className="card" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <label>
            {d.costCodes.code}
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              maxLength={40}
              required
            />
          </label>
          <label>
            {d.costCodes.name}
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={255}
              required
            />
          </label>
          <label>
            {d.common.object}
            <select
              value={draft.objectId}
              onChange={(e) => setDraft({ ...draft, objectId: e.target.value === "" ? "" : Number(e.target.value) })}
            >
              <option value="">{d.common.allObjects}</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {d.costCodes.billableRate}
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.billableRate}
              onChange={(e) => setDraft({ ...draft, billableRate: e.target.value })}
              placeholder={d.costCodes.ratePlaceholder}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? d.common.saving : draft.id === null ? d.costCodes.submitNew : d.common.save}
          </button>
        </form>
      )}

      {!codes && !error && <div className="page-loading">{d.common.loading}</div>}

      {codes && codes.length === 0 && !draft && (
        <div className="card">
          <p>{d.costCodes.none}</p>
        </div>
      )}

      {codes && codes.length > 0 && (
        <ul className="log-list">
          {codes.map((c) => (
            <li key={c.id} className="card log-item">
              <strong>
                {c.code} — {c.name}
              </strong>
              <div className="subtitle">{objectName(c.objectId)}</div>
              <div>
                {c.billableRate === null ? (
                  <span className="text-warning">{d.costCodes.rateUndefined}</span>
                ) : (
                  <>{d.costCodes.rateValue(Number(c.billableRate).toFixed(2))}</>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      code: c.code,
                      name: c.name,
                      objectId: c.objectId ?? "",
                      billableRate: c.billableRate === null ? "" : String(Number(c.billableRate)),
                    })
                  }
                >
                  {d.common.edit}
                </button>
                <button className="btn btn-secondary" onClick={() => handleRemove(c)}>
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
