import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { clearActiveLog, readActiveLog, writeActiveLog } from "../api/offlineCache";
import type { DashboardResponse } from "../api/types";
import { useT } from "../i18n";

export function EndWorkPage() {
  const navigate = useNavigate();
  const d = useT();
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

  if (offlineNotice) {
    return (
      <div className="page">
        <h1>{d.endWork.savedOffline}</h1>
        <div className="alert alert-info">
          {d.endWork.savedOfflineBody}
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard", { replace: true })}>
          {d.common.ok}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{d.endWork.title}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {objectName && (
        <p className="subtitle">
          {d.common.object}: {objectName}
        </p>
      )}
      {(activeLogId !== null || pendingStartId !== null) && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            {d.common.comment}
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>
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
          <button type="submit" className="btn btn-warning" disabled={submitting}>
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
