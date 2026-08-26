import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { acquirePosition, hasFreshFix, PERMISSION_DENIED, warmUpLocation } from "../api/location";
import { ApiError, apiRequest } from "../api/client";
import type { WorkObject, WorkType } from "../api/types";
import { isLocationMocked } from "../plugins/mockLocation";
import { useT } from "../i18n";
import { Icon } from "../components/Icon";
import { enqueue, isOfflineError } from "../api/offlineQueue";
import { readCachedObjects, writeActiveLog, writeCachedObjects } from "../api/offlineCache";

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
  const [locationReady, setLocationReady] = useState(hasFreshFix);

  /**
   * Asukoha otsing algab kohe ekraani avamisel, mitte nupuvajutusest.
   *
   * Kuni töötaja objekti ja tööliigi valib, jõuab GPS tavaliselt fixi
   * kätte saada — nupuvajutuse hetkel on asukoht juba olemas ja ootamist
   * ei teki. Külmalt võttis see varem kuni 20 sekundit, halvemal juhul
   * kaks katset järjest.
   */
  useEffect(() => {
    warmUpLocation();
    // Näita valmisolekut, kui fix kohale jõuab.
    const id = setInterval(() => {
      if (hasFreshFix()) {
        setLocationReady(true);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

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

      let position;
      try {
        position = await acquirePosition();
      } catch (err) {
        throw new Error(
          (err as { code?: number })?.code === PERMISSION_DENIED
            ? d.startWork.locationRequired
            : d.startWork.locationUnavailable
        );
      }

      // Võltsitud GPS ei blokeeri alustamist (vale positiivne jätaks ausa
      // töötaja tööpäevata), aga lipp läheb serverisse ja admin näeb seda.
      const mocked = await isLocationMocked();

      setStatus(d.startWork.registering);
      const body = {
        objectId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy ?? undefined,
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
        <div className={locationReady ? "text-success" : "subtitle"} style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: 0 }}>
          <Icon name={locationReady ? "check" : "pin"} size={18} />
          {locationReady ? d.startWork.locationReady : d.startWork.locatingNow}
        </div>
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
