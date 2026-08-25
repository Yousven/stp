import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { CostCode, WorkObject } from "../api/types";

interface Draft {
  id: number | null;
  code: string;
  name: string;
  objectId: number | "";
  billableRate: string;
}

const EMPTY: Draft = { id: null, code: "", name: "", objectId: "", billableRate: "" };

export function CostCodesPage() {
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
      setError("Kulukoodide laadimine ebaõnnestus.");
    }
  }, []);

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
      setFormError(err instanceof ApiError ? err.message : "Salvestamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(code: CostCode) {
    if (!confirm(`Eemaldada kulukood ${code.code} kasutusest?`)) return;
    try {
      await apiRequest(`/cost-codes/${code.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Eemaldamine ebaõnnestus.");
    }
  }

  function objectName(objectId: number | null): string {
    if (objectId === null) return "Kõik objektid";
    return objects.find((o) => o.id === objectId)?.name ?? `Objekt #${objectId}`;
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Kulukoodid</h1>
        <button className="btn btn-link" onClick={() => setDraft(draft ? null : { ...EMPTY })}>
          {draft ? "Loobu" : "Lisa"}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="subtitle">
        Kulukood ütleb, mille peale tunnid läksid (nt müüritööd, koristus). Arveldusmäär on kliendile
        esitatav tunnihind — see võidab objekti oma. Ilma määrata jäävad tunnid arveldusraportis
        arveldamata.
      </p>

      {draft && (
        <form className="card" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <label>
            Kood
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              maxLength={40}
              required
            />
          </label>
          <label>
            Nimetus
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={255}
              required
            />
          </label>
          <label>
            Objekt
            <select
              value={draft.objectId}
              onChange={(e) => setDraft({ ...draft, objectId: e.target.value === "" ? "" : Number(e.target.value) })}
            >
              <option value="">Kõik objektid</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Arveldusmäär (€/h)
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.billableRate}
              onChange={(e) => setDraft({ ...draft, billableRate: e.target.value })}
              placeholder="määramata"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Salvestan..." : draft.id === null ? "Lisa kulukood" : "Salvesta"}
          </button>
        </form>
      )}

      {!codes && !error && <div className="page-loading">Laadin...</div>}

      {codes && codes.length === 0 && !draft && (
        <div className="card">
          <p>Kulukoode pole veel lisatud. Ilma nendeta lähevad kõik tunnid ühte kotti.</p>
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
                  <span className="text-warning">Arveldusmäär määramata</span>
                ) : (
                  <>Arveldusmäär: €{Number(c.billableRate).toFixed(2)}/h</>
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
                  Muuda
                </button>
                <button className="btn btn-secondary" onClick={() => handleRemove(c)}>
                  Eemalda
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link className="btn btn-link" to="/dashboard">
        Tagasi Dashboardile
      </Link>
    </div>
  );
}
