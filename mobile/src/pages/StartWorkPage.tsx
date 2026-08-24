import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";

const LOCATION_REQUIRED_MESSAGE =
  "Tööpäeva alustamiseks on vaja asukoha luba, et kinnitada, et oled objektil. " +
  "Luba asukoha kasutamine seadetes ja proovi uuesti.";

export function StartWorkPage() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
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
      // Asukoht on kohustuslik: server kontrollib, et oled päriselt objektil.
      // Ilma loata ei saa tööpäeva alustada — see on kogu süsteemi mõte.
      setStatus("Kontrollin asukohta...");

      // checkPermissions/requestPermissions on olemas ainult natiivsel
      // platvormil; veebis viskab plugin "Not implemented on web" ja seal
      // küsib loa brauser ise getCurrentPosition'i käigus.
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== "granted") {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== "granted") {
            throw new Error(LOCATION_REQUIRED_MESSAGE);
          }
        }
      }

      let position;
      try {
        position = await Geolocation.getCurrentPosition({
          timeout: 20000,
          enableHighAccuracy: true,
          maximumAge: 0,
        });
      } catch {
        // Kõige tavalisem põhjus on keelatud luba või välja lülitatud GPS —
        // mõlemal juhul on kasutajale vaja sama selgitust, mitte plugina
        // sisemist veateadet.
        throw new Error(LOCATION_REQUIRED_MESSAGE);
      }

      setStatus("Registreerin tööpäeva...");
      await apiRequest("/time-logs/start", {
        method: "POST",
        body: {
          objectId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Tööpäeva alustamine ebaõnnestus.");
      }
    } finally {
      setStatus("");
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
        <div className="form-hint">Tööpäeva saab alustada ainult objektil kohapeal — asukohta kontrollitakse.</div>
        <button type="submit" className="btn btn-primary" disabled={submitting || objectId === ""}>
          {submitting ? status || "Palun oota..." : "Alusta tööpäeva"}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        Tagasi
      </button>
    </div>
  );
}
