import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { BillingResponse, WorkObject } from "../api/types";

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
      setError("Arveldusandmete laadimine ebaõnnestus.");
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
        <h1>Arveldus</h1>
      </header>

      <p className="subtitle">
        Sama tunniandmestik, mis palgaarvestuses, aga teisest otsast: mida objektile kulus ja mida saab
        kliendilt küsida. Vahe on kate.
      </p>

      <form className="card" onSubmit={load}>
        <label>
          Objekt
          <select
            value={objectId}
            onChange={(e) => setObjectId(e.target.value === "" ? "" : Number(e.target.value))}
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
          Alates
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          Kuni
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Arvutan..." : "Näita"}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {totals && (
        <section className="card">
          <h2>Kokku</h2>
          <dl className="stat-list">
            <div>
              <dt>Tunde</dt>
              <dd>{totals.hours}</dd>
            </div>
            <div>
              <dt>Kulu</dt>
              <dd>{eur(totals.cost)}</dd>
            </div>
            <div>
              <dt>Arveldatav</dt>
              <dd>{eur(totals.billable)}</dd>
            </div>
            <div>
              <dt>Kate</dt>
              <dd className={totals.margin < 0 ? "text-error" : "text-success"}>{eur(totals.margin)}</dd>
            </div>
          </dl>
          {totals.unbilledHours > 0 && (
            <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>
              {totals.unbilledHours} tundi on ilma arveldusmäärata ja neid EI ole ülal arvestatud. Määra
              arveldusmäär objektile või kulukoodile, muidu jääb see raha küsimata.
            </div>
          )}
        </section>
      )}

      {data && data.objects.length === 0 && (
        <div className="card">
          <p>Valitud perioodil pole lõpetatud tööpäevi.</p>
        </div>
      )}

      {data?.objects.map((o) => (
        <section key={o.objectId} className="card">
          <h2>{o.objectName}</h2>
          {o.clientName && <p className="subtitle">Klient: {o.clientName}</p>}

          <dl className="stat-list">
            <div>
              <dt>Tunde</dt>
              <dd>{o.hours}</dd>
            </div>
            <div>
              <dt>Kulu</dt>
              <dd>{eur(o.cost)}</dd>
            </div>
            <div>
              <dt>Arveldatav</dt>
              <dd>{eur(o.billable)}</dd>
            </div>
            <div>
              <dt>Kate</dt>
              <dd className={o.margin < 0 ? "text-error" : "text-success"}>{eur(o.margin)}</dd>
            </div>
          </dl>

          {o.budgetHours !== null && (
            <p className={o.overBudgetHours && o.overBudgetHours > 0 ? "text-error" : "subtitle"}>
              Eelarve: {o.budgetHours} h
              {o.overBudgetHours && o.overBudgetHours > 0 ? ` — ületatud ${o.overBudgetHours} h võrra` : ""}
            </p>
          )}

          {o.unbilledHours > 0 && (
            <p className="text-warning">{o.unbilledHours} h ilma arveldusmäärata</p>
          )}

          <button
            className="btn btn-link"
            style={{ padding: "0.35rem 0" }}
            onClick={() => setExpanded(expanded === o.objectId ? null : o.objectId)}
          >
            {expanded === o.objectId ? "Peida kulukoodid" : "Näita kulukoodide kaupa"}
          </button>

          {expanded === o.objectId && (
            <ul className="log-list">
              {o.lines.map((line) => (
                <li key={line.costCode} className="log-item">
                  <strong>{line.costCode}</strong>
                  <div>
                    {line.hours} h ×{" "}
                    {line.rate === null ? <span className="text-warning">määramata</span> : `${eur(line.rate)}/h`} ={" "}
                    {eur(line.billable)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Link className="btn btn-link" to="/dashboard">
        Tagasi Dashboardile
      </Link>
    </div>
  );
}
