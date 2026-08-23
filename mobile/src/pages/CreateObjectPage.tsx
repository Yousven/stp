import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";

// Minimaalne objekti loomise vorm — ainult admin, ainult loomine (POST).
// Täielik CRUD (muuda/deaktiveeri/nimekiri) on Faas 3 admin-funktsioonide osa.
export function CreateObjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/objects", {
        method: "POST",
        body: {
          name,
          address: address || undefined,
          description: description || undefined,
          latitude: Number(latitude),
          longitude: Number(longitude),
          radius: Number(radius),
        },
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Objekti lisamine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Lisa objekt</h1>
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
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
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
          {submitting ? "Palun oota..." : "Lisa objekt"}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
