import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, buildDownloadUrl } from "../api/client";
import type { AdminUser, ReportPreview, WorkObject } from "../api/types";
import { useLocale, useT } from "../i18n";
import { Icon } from "../components/Icon";

export function ReportsPage() {
  const navigate = useNavigate();
  const d = useT();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [objectId, setObjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const locale = useLocale();
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<WorkObject[]>("/objects/all").then(setObjects).catch(() => undefined);
    apiRequest<AdminUser[]>("/users").then(setUsers).catch(() => undefined);
  }, []);

  /**
   * Raporti vaatamine ilma alla laadimata.
   *
   * Faili avamine telefonis tähendab allalaadimist, õige rakenduse
   * valimist ja tagasi äppi navigeerimist — kolm sammu selleks, et vaadata
   * ühte numbrit. Eelvaade näitab sama andmestiku kohe ekraanil ja fail
   * jääb siis, kui raportit on vaja kellelegi edasi saata.
   */
  async function show() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (objectId) params.set("objectId", objectId);
      if (userId) params.set("userId", userId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      setPreview(await apiRequest<ReportPreview>(`/reports/preview?${params}`));
    } catch {
      setError(d.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function download(format: "excel" | "pdf") {
    const url = await buildDownloadUrl(`/reports/${format}`, { objectId, userId, dateFrom, dateTo });
    window.open(url, "_blank");
  }

  return (
    <div className="page">
      <h1>{d.reports.title}</h1>
      <div className="card">
        <label>
          {d.common.object}
          <select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
            <option value="">{d.common.allObjects}</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {d.reports.worker}
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{d.reports.allWorkers}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          {d.reports.dateFrom}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {d.reports.dateTo}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button className="btn btn-hero btn-primary" onClick={show} disabled={loading}>
          {!loading && <Icon name="report" size={24} />}
          {loading ? d.reports.loading : d.reports.show}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <Icon name="alert" size={20} />
          <span className="alert-strong">{error}</span>
        </div>
      )}

      {preview && (
        <>
          <section className="card">
            <h2>{d.reports.summary}</h2>
            <dl className="stat-list">
              <div>
                <dt>{d.reports.entries}</dt>
                <dd>{preview.totals.logs}</dd>
              </div>
              <div>
                <dt>{d.reports.totalHours}</dt>
                <dd>{preview.totals.hours}</dd>
              </div>
              <div>
                <dt>{d.reports.totalEarnings}</dt>
                <dd>€{preview.totals.earnings.toFixed(2)}</dd>
              </div>
            </dl>
          </section>

          {preview.overtime.length > 0 && (
            <section className="card">
              <h2>{d.reports.overtimeTitle}</h2>
              <ul className="log-list">
                {preview.overtime.map((row) => (
                  <li key={row.username} className="log-item">
                    <div className="log-row">
                      <strong>{row.username}</strong>
                      <div className="log-hours">€{row.total.toFixed(2)}</div>
                    </div>
                    <div className="subtitle" style={{ margin: 0 }}>
                      {d.reports.regularHours}: {row.regularHours} · {d.reports.overtimeHours}:{" "}
                      {row.overtimeHours} · {d.reports.payableHours}: {row.payableHours}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.rows.length === 0 && (
            <div className="card empty-state">
              <Icon name="inbox" size={44} />
              <p>{d.reports.none}</p>
            </div>
          )}

          {preview.truncated && (
            <div className="alert alert-info">
              <Icon name="info" size={20} />
              <span className="alert-strong">
                {d.reports.truncated(preview.rows.length, preview.totalRows)}
              </span>
            </div>
          )}

          <ul className="log-list">
            {preview.rows.map((row) => (
              <li key={row.id} className="card log-item">
                <div className="log-row">
                  <div>
                    <strong>{row.username}</strong>
                    <div className="subtitle" style={{ margin: 0 }}>
                      {row.objectName}
                    </div>
                  </div>
                  <div className="log-hours">{row.netHours != null ? `${row.netHours} h` : "—"}</div>
                </div>
                <div className="subtitle" style={{ margin: 0 }}>
                  {new Date(row.startTime).toLocaleDateString(locale)}{" "}
                  {new Date(row.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {row.endTime
                    ? new Date(row.endTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                  {row.earnings != null && ` · €${row.earnings.toFixed(2)}`}
                </div>
                {row.awayHours != null && row.awayHours > 0 && (
                  <div className="subtitle" style={{ margin: 0 }}>
                    {d.history.awayFromSite(row.awayHours)}
                  </div>
                )}
                {/* Võltsitud GPS ei blokeeri tööpäeva, aga peab raportis
                    silma paistma — muidu ei tea admin seda kunagi kontrollida. */}
                {row.locationMocked && <div className="text-warning">{d.reports.suspicious}</div>}
                {/* Pikk päev tähendab peaaegu alati, et õhtul ununes lõpetamine.
                    Tunde EI ole automaatselt lõigatud — parandab haldur koos
                    põhjendusega, mis läheb audit-logisse. */}
                {row.implausibleLength && (
                  <div className="text-warning">{d.reports.implausibleLength}</div>
                )}
                {row.createdOffline && <div className="subtitle" style={{ margin: 0 }}>{d.reports.offlineEntry}</div>}
                {row.comment && <div className="log-comment">{row.comment}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="card">
        <h2>{d.reports.downloadTitle}</h2>
        <div className="button-stack">
          <button className="btn btn-secondary" onClick={() => download("excel")}>
            {d.reports.downloadExcel}
          </button>
          <button className="btn btn-secondary" onClick={() => download("pdf")}>
            {d.reports.downloadPdf}
          </button>
        </div>
      </div>
      <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
        {d.common.backToDashboard}
      </button>
    </div>
  );
}
