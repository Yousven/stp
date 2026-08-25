import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { BillingResponse, WorkObject } from "../api/types";
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

export function BillingPage() {
  const d = useT();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<BillingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

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
    load();
    // Esmane laadimine jooksva kuu peale; edasi käivitab kasutaja ise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = data?.totals;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.billing.title}</h1>
      </header>

      <p className="subtitle">
        {d.billing.intro}
      </p>

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

      {data && data.objects.length === 0 && (
        <div className="card">
          <p>{d.billing.noData}</p>
        </div>
      )}

      {data?.objects.map((o) => (
        <section key={o.objectId} className="card">
          <h2>{o.objectName}</h2>
          {o.clientName && <p className="subtitle">{d.billing.client(o.clientName)}</p>}

          <dl className="stat-list">
            <div>
              <dt>{d.billing.hours}</dt>
              <dd>{o.hours}</dd>
            </div>
            <div>
              <dt>{d.billing.cost}</dt>
              <dd>{eur(o.cost)}</dd>
            </div>
            <div>
              <dt>{d.billing.billable}</dt>
              <dd>{eur(o.billable)}</dd>
            </div>
            <div>
              <dt>{d.billing.margin}</dt>
              <dd className={o.margin < 0 ? "text-error" : "text-success"}>{eur(o.margin)}</dd>
            </div>
          </dl>

          {o.budgetHours !== null && (
            <p className={o.overBudgetHours && o.overBudgetHours > 0 ? "text-error" : "subtitle"}>
              {d.billing.budget(o.budgetHours)}
              {o.overBudgetHours && o.overBudgetHours > 0 ? d.billing.overBudget(o.overBudgetHours) : ""}
            </p>
          )}

          {o.unbilledHours > 0 && (
            <p className="text-warning">{d.billing.unbilledShort(o.unbilledHours)}</p>
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
                <li key={line.costCode} className="log-item">
                  <strong>{line.costCode}</strong>
                  <div>
                    {line.hours} h ×{" "}
                    {line.rate === null ? <span className="text-warning">{d.billing.rateUndefined}</span> : `${eur(line.rate)}/h`} ={" "}
                    {eur(line.billable)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
