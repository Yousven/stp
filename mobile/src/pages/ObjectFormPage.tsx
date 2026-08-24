import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";
import { AddressMapPicker } from "../components/AddressMapPicker";
import { useAddressSearch } from "../hooks/useAddressSearch";

// Objekti loomise/muutmise vorm — kui URL-is on :id, laeb olemasoleva
// objekti ja teeb PATCH, muidu POST uue loomiseks.
export function ObjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const suggestions = useAddressSearch(showSuggestions ? address : "");

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

  function selectSuggestion(displayName: string, lat: number, lon: number) {
    setAddress(displayName);
    setLatitude(String(lat));
    setLongitude(String(lon));
    setShowSuggestions(false);
  }

  function handleMapChange(lat: number, lon: number) {
    setLatitude(String(round6(lat)));
    setLongitude(String(round6(lon)));
  }

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

  const parsedLat = latitude !== "" ? Number(latitude) : null;
  const parsedLon = longitude !== "" ? Number(longitude) : null;

  return (
    <div className="page">
      <h1>{isEdit ? "Muuda objekti" : "Lisa objekt"}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Objekti nimi
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="address-field">
          Aadress
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Hakka kirjutama aadressi..."
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="suggestion-item"
                  onMouseDown={() => selectSuggestion(s.displayName, s.latitude, s.longitude)}
                >
                  {s.displayName}
                </div>
              ))}
            </div>
          )}
        </label>
        <div className="form-hint">Vali aadress loendist või täpsusta asukohta kaardil.</div>

        <AddressMapPicker latitude={parsedLat} longitude={parsedLon} onChange={handleMapChange} />

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
          Kirjeldus
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
