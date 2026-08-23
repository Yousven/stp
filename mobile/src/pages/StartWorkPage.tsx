import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";

export function StartWorkPage() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<WorkObject[]>("/objects")
      .then((list) => {
        setObjects(list);
        if (list.length > 0) setObjectId(list[0].id);
      })
      .catch(() => setError("Objektide laadimine ebaõnnestus."));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (objectId === "") return;
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/time-logs/start", { method: "POST", body: { objectId } });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tööpäeva alustamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Alusta tööpäeva</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Objekt
          <select value={objectId} onChange={(e) => setObjectId(Number(e.target.value))} required>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting || objectId === ""}>
          {submitting ? "Palun oota..." : "Alusta tööpäeva"}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
