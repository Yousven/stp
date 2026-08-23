import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";

// Objekti loomise/muutmise vorm — kui URL-is on :id, laeb olemasoleva
// objekti ja teeb PATCH, muidu POST uue loomiseks.
export function ObjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    apiRequest<WorkObject[]>("/objects/all")
      .then((objects) => {
        const object = objects.find((o) => o.id === Number(id));
        if (!object) {
          setError("Objekti ei leitud.");
          return;
        }
        setName(object.name);
        setAddress(object.address ?? "");
        setDescription(object.description ?? "");
        setLatitude(object.latitude);
        setLongitude(object.longitude);
        setRadius(String(object.radius));
      })
      .catch(() => setError("Objekti laadimine ebaõnnestus."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const body = {
      name,
      address: address || undefined,
      description: description || undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius: Number(radius),
    };
    try {
      if (isEdit) {
        await apiRequest(`/objects/${id}`, { method: "PATCH", body });
      } else {
        await apiRequest("/objects", { method: "POST", body });
      }
      navigate("/admin/objects", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Objekti salvestamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Laadin...</div>;

  return (
    <div className="page">
      <h1>{isEdit ? "Muuda objekti" : "Lisa objekt"}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Objekti nimi
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>
          Aadress
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          Kirjeldus
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label>
          Latitude
          <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </label>
        <label>
          Lubatud raadius (m)
          <input type="number" min="1" value={radius} onChange={(e) => setRadius(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Palun oota..." : isEdit ? "Salvesta" : "Lisa objekt"}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
