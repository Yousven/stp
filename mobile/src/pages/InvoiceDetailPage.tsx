import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { ApiError, API_BASE, apiRequest } from "../api/client";
import type { Invoice, InvoiceStatus } from "../api/types";
import { useT } from "../i18n";

function eur(value: string | number): string {
  return `€${Number(value).toFixed(2)}`;
}

/**
 * Ühe arve vaade.
 *
 * Kõik väärtused tulevad arve enda hetktõmmisest, mitte praegustest
 * seadistustest — juba esitatud arve peab jääma muutumatuks ka siis, kui
 * hinnad või rekvisiidid vahepeal muutuvad.
 */
export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const d = useT();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvoice(await apiRequest<Invoice>(`/invoices/${id}`));
    } catch {
      setError(d.invoices.loadFailed);
    }
  }, [id, d]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: InvoiceStatus) {
    setError("");
    setBusy(true);
    try {
      await apiRequest(`/invoices/${id}/status`, { method: "POST", body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.invoices.statusFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleVoid() {
    if (!invoice || !confirm(d.invoices.confirmVoid(invoice.number))) return;
    setError("");
    setBusy(true);
    try {
      await apiRequest(`/invoices/${id}/void`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.invoices.voidFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await apiRequest<{ emailed: boolean; clientEmail: string | null }>(
        `/invoices/${id}/send`,
        { method: "POST" }
      );
      setNotice(
        result.clientEmail === null
          ? d.invoices.sentNoEmail
          : result.emailed
            ? d.invoices.sentToEmail(result.clientEmail)
            : d.invoices.sentNotConfigured
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.invoices.statusFailed);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Trükivaade avatakse süsteemi brauseris, kuhu äpi sisselogimise token
   * kaasa ei lähe — seetõttu küsitakse serverilt eraldi lühiajaline link,
   * mis kehtib ainult selle ühe arve kohta.
   */
  async function openPrintView() {
    setError("");
    setBusy(true);
    try {
      const { path } = await apiRequest<{ path: string }>(`/invoices/${id}/print-token`);
      await Browser.open({ url: `${API_BASE}${path}` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.invoices.loadFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!invoice && !error) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {invoice && (
        <>
          <header className="topbar">
            <h1>
              {d.invoices.number} {invoice.number}
            </h1>
          </header>

          <section className="card">
            <div className={invoice.status === "void" ? "text-error" : "subtitle"}>
              {d.invoices.status[invoice.status]}
            </div>
            <div className="subtitle">
              {d.invoices.issued}: {invoice.issueDate} · {d.invoices.due}: {invoice.dueDate}
            </div>
            <div className="subtitle">
              {d.invoices.period}: {invoice.periodFrom} – {invoice.periodTo}
            </div>

            {invoice.clientDetails && (
              <div style={{ marginTop: "0.75rem" }}>
                <strong>{invoice.clientDetails.name}</strong>
                {invoice.clientDetails.registryCode && (
                  <div className="subtitle">{invoice.clientDetails.registryCode}</div>
                )}
                {invoice.clientDetails.address && (
                  <div className="subtitle">{invoice.clientDetails.address}</div>
                )}
                {invoice.clientDetails.email && (
                  <div className="subtitle">{invoice.clientDetails.email}</div>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2>{d.invoices.lines}</h2>
            <ul className="log-list">
              {invoice.lines?.map((line) => (
                <li key={line.id} className="log-item">
                  <strong>{line.description}</strong>
                  <div>
                    {Number(line.hours).toFixed(2)} h × {eur(line.rate)} = {eur(line.amount)}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="stat-list" style={{ marginTop: "0.75rem" }}>
              <div>
                <dt>{d.invoices.subtotal}</dt>
                <dd>{eur(invoice.subtotal)}</dd>
              </div>
              <div>
                <dt>{d.invoices.vat(Number(invoice.vatRate).toFixed(0))}</dt>
                <dd>{eur(invoice.vatAmount)}</dd>
              </div>
              <div>
                <dt>{d.invoices.totalDue}</dt>
                <dd>
                  <strong>{eur(invoice.total)}</strong>
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <button className="btn btn-secondary" onClick={openPrintView} disabled={busy}>
              {d.invoices.open}
            </button>
            {invoice.status !== "void" && (
              <>
                <button className="btn btn-secondary" onClick={handleSend} disabled={busy}>
                  {busy ? d.invoices.sending : d.invoices.send}
                </button>
                {invoice.status === "draft" && (
                  <button className="btn btn-secondary" onClick={() => changeStatus("sent")} disabled={busy}>
                    {d.invoices.markSent}
                  </button>
                )}
                {invoice.status !== "paid" && (
                  <button className="btn btn-secondary" onClick={() => changeStatus("paid")} disabled={busy}>
                    {d.invoices.markPaid}
                  </button>
                )}
                {invoice.status !== "paid" && (
                  <button className="btn btn-secondary" onClick={handleVoid} disabled={busy}>
                    {d.invoices.voidLabel}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}

      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
