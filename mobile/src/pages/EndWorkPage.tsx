import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { clearActiveLog, readActiveLog, writeActiveLog } from "../api/offlineCache";
import type { DashboardResponse } from "../api/types";
import { useT } from "../i18n";
import { useLayout } from "../hooks/useLayout";
import { Icon } from "../components/Icon";

export function EndWorkPage() {
  const navigate = useNavigate();
  const d = useT();
  const layout = useLayout();
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  // Offline alustatud tööpäeval pole veel serveri ID-d, ainult viide
  // järjekorras ootavale alustamisele.
  const [pendingStartId, setPendingStartId] = useState<string | null>(null);
  const [objectName, setObjectName] = useState("");
  const [comment, setComment] = useState("");
  const [travelDuration, setTravelDuration] = useState("0");
  const [lunch, setLunch] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);

  useEffect(() => {
    apiRequest<DashboardResponse>("/me/dashboard")
      .then(async (data) => {
        if (!data.activeLog) {
          setError(d.endWork.noActiveLog);
          await clearActiveLog();
        } else {
          setActiveLogId(data.activeLog.id);
          setObjectName(data.activeLog.object.name);
          await writeActiveLog({
            logId: data.activeLog.id,
            objectName: data.activeLog.object.name,
            startTime: data.activeLog.startTime,
          });
        }
      })
      .catch(async (err) => {
        // Levita peab tööpäeva saama lõpetada — see on kogu offline-toe mõte.
        // Ilma selleta jääks levita objektil töötanud päev üldse sulgemata.
        const cached = isOfflineError(err) ? await readActiveLog() : null;
        if (!cached) {
          setError(d.common.loadFailed);
          return;
        }
        setObjectName(cached.objectName);
        if (cached.logId !== undefined) setActiveLogId(cached.logId);
        else if (cached.pendingActionId) setPendingStartId(cached.pendingActionId);
        else setError(d.common.loadFailed);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeLogId === null && pendingStartId === null) return;
    setError("");
    setSubmitting(true);
    try {
      const body = { comment, travelDuration: Number(travelDuration), lunch: Number(lunch) };
      const occurredAt = new Date().toISOString();

      // Kui ka alustamine on veel järjekorras, ei saa serverisse üldse
      // pöörduda — tööpäeva, mida lõpetada, seal veel ei ole.
      if (pendingStartId !== null) {
        await enqueue({
          path: "/time-logs/{logId}/end",
          method: "POST",
          body,
          occurredAt,
          label: d.endWork.queueLabel,
          dependsOn: pendingStartId,
        });
        await clearActiveLog();
        setOfflineNotice(true);
        return;
      }

      try {
        await apiRequest(`/time-logs/${activeLogId}/end`, { method: "POST", body });
      } catch (err) {
        if (!isOfflineError(err)) throw err;
        await enqueue({
          path: `/time-logs/${activeLogId}/end`,
          method: "POST",
          body,
          occurredAt,
          label: d.endWork.queueLabel,
        });
        await clearActiveLog();
        setOfflineNotice(true);
        return;
      }

      await clearActiveLog();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.endWork.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">{d.common.loading}</div>;

  /**
   * Arvutis ei saa tööpäeva registreerida: asukohta ei ole millegagi
   * tõendada ja server keelduks niikuinii. Selgitame selle ära, mitte ei
   * lase kasutajal vormi täita ja siis veateadet saada.
   */
  if (layout === "desktop") {
    return (
      <div className="page">
        <h1>{d.desktop.phoneOnly}</h1>
        <div className="card">
          <p className="subtitle" style={{ margin: 0 }}>
            {d.desktop.phoneOnlyBody}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/dashboard" style={{ alignSelf: "flex-start" }}>
          {d.common.backToDashboard}
        </Link>
      </div>
    );
  }

  if (offlineNotice) {
    return (
      <div className="page">
        <h1>{d.endWork.savedOffline}</h1>
        <div className="alert alert-success">
          <Icon name="check" size={20} />
          <span className="alert-strong">{d.endWork.savedOfflineBody}</span>
        </div>
        <button className="btn btn-hero btn-primary" onClick={() => navigate("/dashboard", { replace: true })}>
          {d.common.ok}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{d.endWork.title}</h1>
      {error && (
        <div className="alert alert-error">
          <Icon name="alert" size={20} />
          <span className="alert-strong">{error}</span>
        </div>
      )}
      {objectName && (
        <section className="status-card">
          <div className="status-head">
            <Icon name="pin" size={22} />
            {objectName}
          </div>
        </section>
      )}
      {(activeLogId !== null || pendingStartId !== null) && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            {d.common.comment}
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>
          <div className="form-hint">{d.endWork.commentHint}</div>
          <label>
            {d.endWork.travelDuration}
            <input
              type="number"
              step="0.1"
              min="0"
              value={travelDuration}
              onChange={(e) => setTravelDuration(e.target.value)}
            />
          </label>
          <label>
            {d.endWork.lunch}
            <input type="number" step="0.1" min="0" value={lunch} onChange={(e) => setLunch(e.target.value)} />
          </label>
          {/* Kümnendtundide selgitus: "0.5" ei ole ilmne inimesele, kes
              mõtleb pooltes tundides ja minutites. */}
          <div className="form-hint">{d.endWork.hoursHint}</div>
          <button type="submit" className="btn btn-hero btn-warning" disabled={submitting}>
            {!submitting && <Icon name="stop" size={26} filled />}
            {submitting ? d.common.pleaseWait : d.endWork.submit}
          </button>
        </form>
      )}
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
