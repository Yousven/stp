import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { clearActiveLog, readActiveLog, writeActiveLog } from "../api/offlineCache";
import type { DashboardResponse } from "../api/types";

export function EndWorkPage() {
  const navigate = useNavigate();
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
          setError("Aktiivset töölogi ei leitud. Tööpäev pole alustatud.");
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
          setError("Andmete laadimine ebaõnnestus.");
          return;
        }
        setObjectName(cached.objectName);
        if (cached.logId !== undefined) setActiveLogId(cached.logId);
        else if (cached.pendingActionId) setPendingStartId(cached.pendingActionId);
        else setError("Andmete laadimine ebaõnnestus.");
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
          label: "Tööpäeva lõpetamine",
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
          label: "Tööpäeva lõpetamine",
        });
        await clearActiveLog();
        setOfflineNotice(true);
        return;
      }

      await clearActiveLog();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tööpäeva lõpetamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Laadin...</div>;

  if (offlineNotice) {
    return (
      <div className="page">
        <h1>Salvestatud offline</h1>
        <div className="alert alert-info">
          Ühendust ei olnud, aga tööpäeva lõpp on telefoni salvestatud praeguse kellaajaga. See saadetakse
          automaatselt, kui võrk taastub.
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard", { replace: true })}>
          Selge
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Lõpeta tööpäev</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {objectName && <p className="subtitle">Objekt: {objectName}</p>}
      {(activeLogId !== null || pendingStartId !== null) && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Kommentaar
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>
          <label>
            Sõidu kestus (tunnid)
            <input
              type="number"
              step="0.1"
              min="0"
              value={travelDuration}
              onChange={(e) => setTravelDuration(e.target.value)}
            />
          </label>
          <label>
            Lõuna kestus (tunnid)
            <input type="number" step="0.1" min="0" value={lunch} onChange={(e) => setLunch(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-warning" disabled={submitting}>
            {submitting ? "Palun oota..." : "Lõpeta tööpäev"}
          </button>
        </form>
      )}
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
