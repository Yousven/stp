import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject, WorkType } from "../api/types";
import { isLocationMocked } from "../plugins/mockLocation";
import { useT } from "../i18n";
import { Icon } from "../components/Icon";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { readCachedObjects, writeActiveLog, writeCachedObjects } from "../api/offlineCache";

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
async function resolvePosition(messages: { required: string; unavailable: string }) {
  try {
    return await Geolocation.getCurrentPosition({ timeout: 20000, enableHighAccuracy: true, maximumAge: 0 });
  } catch (first) {
    if ((first as { code?: number })?.code === PERMISSION_DENIED) {
      throw new Error(messages.required);
    }
    try {
      return await Geolocation.getCurrentPosition({ timeout: 30000, enableHighAccuracy: false, maximumAge: 60000 });
    } catch (second) {
      // Tegelik põhjus konsooli, et vea uurimine ei algaks nullist.
      console.warn("Asukoha määramine ebaõnnestus", first, second);
      if ((second as { code?: number })?.code === PERMISSION_DENIED) {
        throw new Error(messages.required);
      }
      throw new Error(messages.unavailable);
    }
  }
}

export function StartWorkPage() {
  const navigate = useNavigate();
  const d = useT();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [objectId, setObjectId] = useState<number | "">("");
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workTypeId, setWorkTypeId] = useState<number | "">("");
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
        else setError(d.startWork.objectsLoadFailed);
      });
  }, []);

  // Tööliigid sõltuvad objektist: server tagastab ainult need, mis sellel
  // objektil käivad. Ilma valikuta läheksid tunnid arvelduses "määramata"
  // alla ja tellijale jääks see töö arvele panemata.
  useEffect(() => {
    if (objectId === "") return;
    let cancelled = false;
    apiRequest<WorkType[]>(`/work-types?objectId=${objectId}`)
      .then((list) => {
        if (cancelled) return;
        setWorkTypes(list);
        // Kui objektil on täpselt üks tööliik, ei ole mõtet valikut nõuda.
        setWorkTypeId(list.length === 1 ? list[0].id : "");
      })
      .catch(() => {
        // Levita või seadistamata tööliikide korral peab alustamine ikka
        // toimima — see väli on valikuline.
        if (!cancelled) setWorkTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [objectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (objectId === "") return;
    setError("");
    setSubmitting(true);

    try {
      // Asukoht on kohustuslik: server kontrollib, et oled päriselt objektil.
      // Ilma loata ei saa tööpäeva alustada — see on kogu süsteemi mõte.
      setStatus(d.startWork.checkingLocation);

      // checkPermissions/requestPermissions on olemas ainult natiivsel
      // platvormil; veebis viskab plugin "Not implemented on web" ja seal
      // küsib loa brauser ise getCurrentPosition'i käigus.
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== "granted") {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== "granted") {
            throw new Error(d.startWork.locationRequired);
          }
        }
      }

      const position = await resolvePosition({
        required: d.startWork.locationRequired,
        unavailable: d.startWork.locationUnavailable,
      });

      // Võltsitud GPS ei blokeeri alustamist (vale positiivne jätaks ausa
      // töötaja tööpäevata), aga lipp läheb serverisse ja admin näeb seda.
      const mocked = await isLocationMocked();

      setStatus(d.startWork.registering);
      const body = {
        objectId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        mocked,
        ...(workTypeId === "" ? {} : { workTypeId }),
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
          label: d.startWork.queueLabel(objectName),
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
        setError(d.startWork.failed);
      }
    } finally {
      setStatus("");
      setSubmitting(false);
    }
  }

  if (offlineNotice) {
    return (
      <div className="page">
        <h1>{d.startWork.savedOffline}</h1>
        <div className="alert alert-success">
          <Icon name="check" size={20} />
          <span className="alert-strong">{d.startWork.savedOfflineBody}</span>
        </div>
        <button className="btn btn-hero btn-primary" onClick={() => navigate("/dashboard", { replace: true })}>
          {d.common.ok}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{d.startWork.title}</h1>
      {error && (
        <div className="alert alert-error">
          <Icon name="alert" size={20} />
          <span className="alert-strong">{error}</span>
        </div>
      )}
      {/* Miks asukohta küsitakse, seisab enne vormi, mitte peenes kirjas
          nupu kohal — võõras inimene peab aru saama, mida ta lubab. */}
      <div className="alert alert-info">
        <Icon name="pin" size={20} />
        <span className="alert-strong">{d.startWork.hint}</span>
      </div>
      <form className="card" onSubmit={handleSubmit}>
        <label>
          {d.common.object}
          <select value={objectId} onChange={(e) => setObjectId(Number(e.target.value))} required>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        {workTypes.length > 0 && (
          <label>
            {d.startWork.workType}
            <select
              value={workTypeId}
              onChange={(e) => setWorkTypeId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">{d.common.undefinedValue}</option>
              {workTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="btn btn-hero btn-primary" disabled={submitting || objectId === ""}>
          {!submitting && <Icon name="play" size={26} filled />}
          {submitting ? status || d.common.pleaseWait : d.startWork.title}
        </button>
      </form>
      <button className="btn btn-link" onClick={() => navigate(-1)}>
        {d.common.back}
      </button>
    </div>
  );
}
