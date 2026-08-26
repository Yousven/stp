import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { ObjectWorkType } from "../api/types";
import { useT } from "../i18n";

interface Row extends ObjectWorkType {
  /** Vormi tekstiväli; tühi = kehtib tööliigi vaikehind. */
  rateInput: string;
}

/**
 * Objektil kasutatavad tööliigid ja nende hinnad.
 *
 * See ekraan on kogu muudatuse tuum: siin öeldakse, et ühel objektil käib
 * korraga lammutus, maalritöö ja koristus, igaüks oma tunnihinnaga.
 */
export function ObjectWorkTypesPage() {
  const { id } = useParams<{ id: string }>();
  const d = useT();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<ObjectWorkType[]>(`/objects/${id}/work-types`)
      .then((list) =>
        setRows(
          list.map((row) => ({
            ...row,
            rateInput: row.rate === null ? "" : String(Number(row.rate)),
          }))
        )
      )
      .catch(() => setError(d.objectWorkTypes.loadFailed));
  }, [id, d]);

  function update(workTypeId: number, patch: Partial<Row>) {
    setSaved(false);
    setRows((current) =>
      current?.map((row) => (row.workTypeId === workTypeId ? { ...row, ...patch } : row)) ?? null
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rows) return;
    setError("");
    setSubmitting(true);
    try {
      await apiRequest(`/objects/${id}/work-types`, {
        method: "PUT",
        body: {
          workTypes: rows
            .filter((row) => row.enabled)
            .map((row) => ({
              workTypeId: row.workTypeId,
              rate: row.rateInput.trim() === "" ? null : Number(row.rateInput),
            })),
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.objectWorkTypes.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (!rows && !error) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      <h1>{d.objectWorkTypes.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">{d.objectWorkTypes.saved}</div>}

      <p className="subtitle">{d.objectWorkTypes.intro}</p>

      {rows && rows.length === 0 && (
        <div className="card">
          <p>{d.objectWorkTypes.none}</p>
          <Link className="btn btn-primary" to="/admin/work-types">
            {d.objectWorkTypes.manageWorkTypes}
          </Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <form className="card" onSubmit={handleSubmit}>
          <ul className="log-list">
            {rows.map((row) => (
              <li key={row.workTypeId} className="log-item">
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => update(row.workTypeId, { enabled: e.target.checked })}
                  />
                  <strong>{row.name}</strong>
                </label>
                {row.enabled && (
                  <label>
                    {d.objectWorkTypes.rate}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.rateInput}
                      onChange={(e) => update(row.workTypeId, { rateInput: e.target.value })}
                      placeholder={
                        row.defaultRate === null
                          ? d.objectWorkTypes.noDefault
                          : d.objectWorkTypes.inherit(Number(row.defaultRate).toFixed(2))
                      }
                    />
                  </label>
                )}
              </li>
            ))}
          </ul>
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
