import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { DashboardResponse } from "../api/types";

export function EndWorkPage() {
  const navigate = useNavigate();
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [travelDuration, setTravelDuration] = useState("0");
  const [lunch, setLunch] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<DashboardResponse>("/me/dashboard")
      .then((data) => {
        if (!data.activeLog) {
          setError("Aktiivset töölogi ei leitud. Tööpäev pole alustatud.");
        } else {
          setActiveLogId(data.activeLog.id);
        }
      })
      .catch(() => setError("Andmete laadimine ebaõnnestus."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeLogId === null) return;
    setError("");
    setSubmitting(true);
    try {
      await apiRequest(`/time-logs/${activeLogId}/end`, {
        method: "POST",
        body: { comment, travelDuration: Number(travelDuration), lunch: Number(lunch) },
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tööpäeva lõpetamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Laadin...</div>;

  return (
    <div className="page">
      <h1>Lõpeta tööpäev</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {activeLogId !== null && (
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
