import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { BillingResponse, Client, Invoice, WorkObject } from "../api/types";
import { useT } from "../i18n";

function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("sv-SE");
}

function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function eur(n: number): string {
  return `€${n.toFixed(2)}`;
}

/**
 * Arvelduse eelvaade tellijate kaupa.
 *
 * Sisuliselt arve mustand: siin näidatakse täpselt need read ja summad,
 * mis "Tee arve" nupust vormistatakse. Vaikimisi ainult veel arveldamata
 * tunnid, et sama tundi ei saaks kaks korda arvele panna.
 */
export function BillingPage() {
  const d = useT();
  const navigate = useNavigate();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<BillingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creating, setCreating] = useState<number | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (objectId !== "") params.set("objectId", String(objectId));
      setData(await apiRequest<BillingResponse>(`/billing?${params}`));
    } catch {
      setError(d.billing.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiRequest<WorkObject[]>("/objects")
      .then(setObjects)
      .catch(() => {
        /* filter on valikuline */
      });
    apiRequest<Client[]>("/clients")
      .then(setClients)
      .catch(() => {
        /* tellijate loend on abiinfo */
      });
    load();
    // Esmane laadimine jooksva kuu peale; edasi käivitab kasutaja ise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createInvoice(clientId: number) {
    setError("");
    setCreating(clientId);
    try {
      const invoice = await apiRequest<Invoice>("/invoices", {
        method: "POST",
        body: {
          clientId,
          dateFrom,
          dateTo,
          ...(objectId === "" ? {} : { objectId }),
        },
      });
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.billing.createFailed);
      setCreating(null);
    }
  }

  const totals = data?.totals;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.billing.title}</h1>
        <Link className="btn btn-link" to="/admin/invoices">
          {d.invoices.title}
        </Link>
      </header>

      <p className="subtitle">{d.billing.intro}</p>

      <form className="card" onSubmit={load}>
        <label>
          {d.common.object}
          <select
            value={objectId}
            onChange={(e) => setObjectId(e.target.value === "" ? "" : Number(e.target.value))}
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
          {d.common.from}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {d.common.to}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? d.billing.calculating : d.common.show}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {totals && (
        <section className="card">
          <h2>{d.billing.total}</h2>
          <dl className="stat-list">
            <div>
              <dt>{d.billing.hours}</dt>
              <dd>{totals.hours}</dd>
            </div>
            <div>
              <dt>{d.billing.cost}</dt>
              <dd>{eur(totals.cost)}</dd>
            </div>
            <div>
              <dt>{d.billing.billable}</dt>
              <dd>{eur(totals.billable)}</dd>
            </div>
            <div>
              <dt>{d.billing.margin}</dt>
              <dd className={totals.margin < 0 ? "text-error" : "text-success"}>{eur(totals.margin)}</dd>
            </div>
          </dl>
          {totals.unbilledHours > 0 && (
            <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>
              {d.billing.unbilledWarning(totals.unbilledHours)}
            </div>
          )}
        </section>
      )}

      {data && data.clients.length === 0 && (
        <div className="card">
          <p>{d.billing.noData}</p>
        </div>
      )}

      {data?.clients.map((client) => (
        <section key={client.clientId ?? "none"} className="card">
          <h2>{client.clientName ?? d.billing.noClient}</h2>

          <dl className="stat-list">
            <div>
              <dt>{d.billing.hours}</dt>
              <dd>{client.hours}</dd>
            </div>
            <div>
              <dt>{d.billing.cost}</dt>
              <dd>{eur(client.cost)}</dd>
            </div>
            <div>
              <dt>{d.billing.billable}</dt>
              <dd>{eur(client.billable)}</dd>
            </div>
            <div>
              <dt>{d.billing.margin}</dt>
              <dd className={client.margin < 0 ? "text-error" : "text-success"}>{eur(client.margin)}</dd>
            </div>
          </dl>

          {client.unbilledHours > 0 && (
            <p className="text-warning">{d.billing.unbilledShort(client.unbilledHours)}</p>
          )}

          {client.objects.map((o) => (
            <div key={o.objectId} style={{ marginTop: "0.75rem" }}>
              <strong>{o.objectName}</strong>
              <div className="subtitle">
                {o.hours} {d.common.hours} · {eur(o.billable)}
              </div>

              {o.budgetHours !== null && (
                <p className={o.overBudgetHours && o.overBudgetHours > 0 ? "text-error" : "subtitle"}>
                  {d.billing.budget(o.budgetHours)}
                  {o.overBudgetHours && o.overBudgetHours > 0 ? d.billing.overBudget(o.overBudgetHours) : ""}
                </p>
              )}

              <button
                className="btn btn-link"
                style={{ padding: "0.35rem 0" }}
                onClick={() => setExpanded(expanded === o.objectId ? null : o.objectId)}
              >
                {expanded === o.objectId ? d.billing.hideLines : d.billing.showLines}
              </button>

              {expanded === o.objectId && (
                <ul className="log-list">
                  {o.lines.map((line) => (
                    <li key={`${line.objectId}:${line.workTypeId ?? "none"}`} className="log-item">
                      <strong>{line.workTypeName ?? d.common.undefinedValue}</strong>
                      <div>
                        {line.hours} h ×{" "}
                        {line.rate === null ? (
                          <span className="text-warning">{d.billing.rateUndefined}</span>
                        ) : (
                          `${eur(line.rate)}/h`
                        )}{" "}
                        = {eur(line.billable)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Arve saab teha ainult tellijale — tellijata objektid on
              seadistamata ja nende jaoks pole kellelegi arvet esitada. */}
          {client.clientId === null ? (
            <p className="text-warning" style={{ marginTop: "0.75rem" }}>
              {d.billing.needsClient}
            </p>
          ) : (
            <button
              className="btn btn-primary"
              style={{ marginTop: "0.75rem" }}
              disabled={creating !== null || client.billable <= 0}
              onClick={() => createInvoice(client.clientId!)}
            >
              {creating === client.clientId ? d.billing.creating : d.billing.createInvoice}
            </button>
          )}
        </section>
      ))}

      {clients.length === 0 && (
        <Link className="btn btn-link" to="/admin/clients">
          {d.clients.title}
        </Link>
      )}

      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
