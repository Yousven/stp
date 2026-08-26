import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { Invoice } from "../api/types";
import { useT } from "../i18n";

function eur(value: string): string {
  return `€${Number(value).toFixed(2)}`;
}

export function InvoicesPage() {
  const d = useT();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Invoice[]>("/invoices")
      .then(setInvoices)
      .catch(() => setError(d.invoices.loadFailed));
  }, [d]);

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.invoices.title}</h1>
        <Link className="btn btn-link" to="/admin/billing">
          {d.billing.title}
        </Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="subtitle">{d.invoices.intro}</p>

      {!invoices && !error && <div className="page-loading">{d.common.loading}</div>}

      {invoices && invoices.length === 0 && (
        <div className="card">
          <p>{d.invoices.none}</p>
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <ul className="log-list">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="card log-item">
              <Link to={`/admin/invoices/${invoice.id}`}>
                <strong>
                  {invoice.number} — {invoice.client?.name}
                </strong>
              </Link>
              <div className="subtitle">
                {d.invoices.period}: {invoice.periodFrom} – {invoice.periodTo}
              </div>
              <div className="subtitle">
                {d.invoices.due}: {invoice.dueDate}
              </div>
              <div>
                <strong>{eur(invoice.total)}</strong>{" "}
                <span className={invoice.status === "void" ? "text-error" : "subtitle"}>
                  {d.invoices.status[invoice.status]}
                </span>
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
