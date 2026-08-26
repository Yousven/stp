import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { Client } from "../api/types";
import { useT } from "../i18n";

interface Draft {
  id: number | null;
  name: string;
  registryCode: string;
  vatNumber: string;
  email: string;
  address: string;
  paymentTermDays: string;
  vatRate: string;
  notes: string;
}

const EMPTY: Draft = {
  id: null,
  name: "",
  registryCode: "",
  vatNumber: "",
  email: "",
  address: "",
  paymentTermDays: "14",
  vatRate: "24",
  notes: "",
};

/** Tellijate haldus — ettevõtted, kellele objekti tunnid arveldatakse. */
export function ClientsPage() {
  const d = useT();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setClients(await apiRequest<Client[]>("/clients"));
    } catch {
      setError(d.clients.loadFailed);
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
        registryCode: draft.registryCode.trim() || null,
        vatNumber: draft.vatNumber.trim() || null,
        email: draft.email.trim() || null,
        address: draft.address.trim() || null,
        paymentTermDays: Number(draft.paymentTermDays || "14"),
        vatRate: Number(draft.vatRate || "0"),
        notes: draft.notes.trim() || null,
      };
      if (draft.id === null) {
        await apiRequest("/clients", { method: "POST", body });
      } else {
        await apiRequest(`/clients/${draft.id}`, { method: "PATCH", body });
      }
      setDraft(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : d.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(client: Client) {
    if (!confirm(d.clients.confirmRemove(client.name))) return;
    try {
      await apiRequest(`/clients/${client.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.clients.removeFailed);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.clients.title}</h1>
        <button className="btn btn-link" onClick={() => setDraft(draft ? null : { ...EMPTY })}>
          {draft ? d.common.cancel : d.common.add}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="subtitle">{d.clients.intro}</p>

      {draft && (
        <form className="card" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <label>
            {d.clients.name}
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={255}
              required
              autoFocus
            />
          </label>
          <label>
            {d.clients.registryCode}
            <input
              value={draft.registryCode}
              onChange={(e) => setDraft({ ...draft, registryCode: e.target.value })}
              maxLength={40}
            />
          </label>
          <label>
            {d.clients.vatNumber}
            <input
              value={draft.vatNumber}
              onChange={(e) => setDraft({ ...draft, vatNumber: e.target.value })}
              maxLength={40}
            />
          </label>
          <label>
            {d.clients.address}
            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              maxLength={255}
            />
          </label>
          <label>
            {d.clients.email}
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              maxLength={255}
            />
          </label>
          <div className="form-hint">{d.clients.emailHint}</div>
          <label>
            {d.clients.paymentTermDays}
            <input
              type="number"
              min="0"
              max="365"
              value={draft.paymentTermDays}
              onChange={(e) => setDraft({ ...draft, paymentTermDays: e.target.value })}
            />
          </label>
          <label>
            {d.clients.vatRate}
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={draft.vatRate}
              onChange={(e) => setDraft({ ...draft, vatRate: e.target.value })}
            />
          </label>
          <label>
            {d.clients.notes}
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? d.common.saving : draft.id === null ? d.clients.submitNew : d.common.save}
          </button>
        </form>
      )}

      {!clients && !error && <div className="page-loading">{d.common.loading}</div>}

      {clients && clients.length === 0 && !draft && (
        <div className="card">
          <p>{d.clients.none}</p>
        </div>
      )}

      {clients && clients.length > 0 && (
        <ul className="log-list">
          {clients.map((c) => (
            <li key={c.id} className="card log-item">
              <strong>{c.name}</strong>
              {c.registryCode && <div className="subtitle">{c.registryCode}</div>}
              {c.address && <div className="subtitle">{c.address}</div>}
              {c.email && <div className="subtitle">{c.email}</div>}
              <div className="subtitle">
                {d.clients.objectCount(c._count?.objects ?? 0)} · {d.clients.invoiceCount(c._count?.invoices ?? 0)}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      registryCode: c.registryCode ?? "",
                      vatNumber: c.vatNumber ?? "",
                      email: c.email ?? "",
                      address: c.address ?? "",
                      paymentTermDays: String(c.paymentTermDays),
                      vatRate: String(Number(c.vatRate)),
                      notes: c.notes ?? "",
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
