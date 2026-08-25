import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";
import { AddressMapPicker } from "../components/AddressMapPicker";
import { useAddressSearch } from "../hooks/useAddressSearch";
import { useT } from "../i18n";

// Objekti loomise/muutmise vorm — kui URL-is on :id, laeb olemasoleva
// objekti ja teeb PATCH, muidu POST uue loomiseks.
export function ObjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const d = useT();

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
          setError(d.objectForm.notFound);
          return;
        }
        setName(object.name);
        setAddress(object.address ?? "");
        setDescription(object.description ?? "");
        setLatitude(object.latitude);
        setLongitude(object.longitude);
        setRadius(String(object.radius));
      })
      .catch(() => setError(d.objectForm.loadFailed))
      .finally(() => setLoading(false));
  }, [id, isEdit, d]);

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
      setError(err instanceof ApiError ? err.message : d.objectForm.saveFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">{d.common.loading}</div>;

  const parsedLat = latitude !== "" ? Number(latitude) : null;
  const parsedLon = longitude !== "" ? Number(longitude) : null;

  return (
    <div className="page">
      <h1>{isEdit ? d.objectForm.titleEdit : d.objectForm.titleNew}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <label>
          {d.objectForm.name}
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="address-field">
          {d.objectForm.address}
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={d.objectForm.addressPlaceholder}
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
        <div className="form-hint">{d.objectForm.addressHint}</div>

        <AddressMapPicker latitude={parsedLat} longitude={parsedLon} onChange={handleMapChange} />

        <label>
          {d.objectForm.latitude}
          <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
        </label>
        <label>
          {d.objectForm.longitude}
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </label>
        <label>
          {d.objectForm.description}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label>
          {d.objectForm.radius}
          <input type="number" min="1" value={radius} onChange={(e) => setRadius(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? d.common.pleaseWait : isEdit ? d.common.save : d.objectForm.titleNew}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
