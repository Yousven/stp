import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject } from "../api/types";
import { isLocationMocked } from "../plugins/mockLocation";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { readCachedObjects, writeActiveLog, writeCachedObjects } from "../api/offlineCache";

const LOCATION_REQUIRED_MESSAGE =
  "Tööpäeva alustamiseks on vaja asukoha luba, et kinnitada, et oled objektil. " +
  "Luba asukoha kasutamine seadetes ja proovi uuesti.";

const LOCATION_UNAVAILABLE_MESSAGE =
  "Asukohta ei õnnestunud määrata. Sisetingimustes või ilma levita võtab GPS aega — " +
  "mine võimalusel lahtise taeva alla ja proovi uuesti.";

/** Brauseri GeolocationPositionError.code: 1 = luba puudub. */
const PERMISSION_DENIED = 1;

/**
 * Küsib asukoha, eristades puuduvat luba asukoha mitteleidmisest.
 *
 * Levita objektil ei ole telefonil A-GPS-i abi ja esimene fix võib võtta
 * kümneid sekundeid. Seepärast proovime ebaõnnestumisel teist korda
 * leebemate tingimustega — muidu jääks töötaja just seal, kus offline-tugi
 * kõige rohkem vajalik on, tööpäevata.
 */
async function resolvePosition() {
  try {
    return await Geolocation.getCurrentPosition({ timeout: 20000, enableHighAccuracy: true, maximumAge: 0 });
  } catch (first) {
    if ((first as { code?: number })?.code === PERMISSION_DENIED) {
      throw new Error(LOCATION_REQUIRED_MESSAGE);
    }
    try {
      return await Geolocation.getCurrentPosition({ timeout: 30000, enableHighAccuracy: false, maximumAge: 60000 });
    } catch (second) {
      // Tegelik põhjus konsooli, et vea uurimine ei algaks nullist.
      console.warn("Asukoha määramine ebaõnnestus", first, second);
      if ((second as { code?: number })?.code === PERMISSION_DENIED) {
        throw new Error(LOCATION_REQUIRED_MESSAGE);
      }
      throw new Error(LOCATION_UNAVAILABLE_MESSAGE);
    }
  }
}

export function StartWorkPage() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);

  useEffect(() => {
    function show(list: WorkObject[]) {
      setObjects(list);
      if (list.length > 0) setObjectId(list[0].id);
    }

    apiRequest<WorkObject[]>("/objects")
      .then((list) => {
        show(list);
        void writeCachedObjects(list);
      })
      .catch(async (err) => {
        // Levita peab vorm ikkagi avanema, muidu ei saa objektil tööd
        // alustadagi. Viimane teadaolev nimekiri on selleks piisav.
        const cached = isOfflineError(err) ? await readCachedObjects<WorkObject>() : null;
        if (cached && cached.length > 0) show(cached);
        else setError("Objektide laadimine ebaõnnestus.");
      });
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

      const position = await resolvePosition();

      // Võltsitud GPS ei blokeeri alustamist (vale positiivne jätaks ausa
      // töötaja tööpäevata), aga lipp läheb serverisse ja admin näeb seda.
      const mocked = await isLocationMocked();

      setStatus("Registreerin tööpäeva...");
      const body = {
        objectId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        mocked,
      };
      const occurredAt = new Date().toISOString();

      try {
        await apiRequest("/time-logs/start", { method: "POST", body });
      } catch (err) {
        // Serveri sisuline keeldumine (nt objektist liiga kaugel) peab
        // kasutajani jõudma; ainult võrgutõrge läheb järjekorda.
        if (!isOfflineError(err)) throw err;

        const objectName = objects.find((o) => o.id === objectId)?.name ?? "objekt";
        const actionId = await enqueue({
          path: "/time-logs/start",
          method: "POST",
          body,
          occurredAt,
          label: `Tööpäeva alustamine (${objectName})`,
        });
        // Ilma selleta ei saaks töötaja sama tööpäeva levita lõpetada:
        // lõpetamise vorm vajab viidet tööpäevale, mida serveris veel pole.
        await writeActiveLog({ pendingActionId: actionId, objectName, startTime: occurredAt });
        setOfflineNotice(true);
        return;
      }

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

  if (offlineNotice) {
    return (
      <div className="page">
        <h1>Salvestatud offline</h1>
        <div className="alert alert-info">
          Ühendust ei olnud, aga tööpäeva algus on telefoni salvestatud koos praeguse kellaaja ja asukohaga. See
          saadetakse automaatselt, kui võrk taastub — sa ei pea midagi tegema.
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard", { replace: true })}>
          Selge
        </button>
      </div>
    );
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
