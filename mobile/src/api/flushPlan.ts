// Puhas otsustusloogika offline-järjekorra saatmiseks — teadlikult ilma
// Capacitori ja HTTP-kliendi impordita, et seda saaks node:test'iga otse
// käivitada. Siin peitub palgaarvestuse mõttes ohtlik haru: vale otsus
// kustutaks vaikselt töötaja tööpäeva järjekorrast.

export interface QueuedAction {
  id: string;
  /**
   * API tee, nt "/time-logs/start". Võib sisaldada kohatäidet
   * `{logId}`, mis asendatakse `dependsOn` tegevuse vastusest saadud
   * ID-ga alles saatmise hetkel.
   */
  path: string;
  method: "POST";
  body: Record<string, unknown>;
  /** Millal kasutaja tegevuse sooritas (seadme kell). */
  occurredAt: string;
  /** Inimloetav kirjeldus järjekorra kuvamiseks. */
  label: string;
  /**
   * Selle järjekorras oleva tegevuse id, mille server-poolset ID-d see
   * tegevus vajab. Kasutusel siis, kui terve tööpäev — nii algus kui lõpp —
   * salvestati ilma levita: lõpetamise tee on teada alles siis, kui algus
   * on serverisse jõudnud.
   */
  dependsOn?: string;
}

/** Mida teha ühe järjekorras oleva tegevusega. */
export type FlushDecision =
  | { kind: "send"; path: string }
  | { kind: "defer" }
  | { kind: "drop"; reason: string };

/** Seis, mis on tekkinud selle flush'i käigus juba töödeldud tegevustest. */
export interface FlushState {
  /** Järjekorra id → serveri antud töölogi id. */
  resolvedIds: Map<string, number>;
  /** Võrguvea tõttu edasi lükatud (proovime hiljem uuesti). */
  deferred: Set<string>;
  /** Lõplikult tagasi lükatud — kordamine ei aitaks. */
  dead: Set<string>;
}

/**
 * Otsustab ühe tegevuse saatuse. Eraldi funktsioonina, kuna siin peitub
 * palgaarvestuse mõttes ohtlik haru: vale otsus kustutaks vaikselt töötaja
 * päeva järjekorrast. Sõltuvused pärivad oma aluse saatuse.
 */
export function decideAction(action: QueuedAction, state: FlushState): FlushDecision {
  if (!action.dependsOn) return { kind: "send", path: action.path };

  if (state.deferred.has(action.dependsOn)) return { kind: "defer" };
  if (state.dead.has(action.dependsOn)) {
    return { kind: "drop", reason: "Seotud tööpäeva alustamine ebaõnnestus." };
  }

  const logId = state.resolvedIds.get(action.dependsOn);
  if (logId === undefined) {
    // Alust pole selles järjekorras (nt eelmine flush saatis ta juba ära ja
    // jättis selle rippuma). Ilma ID-ta pole midagi saata.
    return { kind: "drop", reason: "Seotud tööpäeva ei leitud." };
  }

  return { kind: "send", path: action.path.replace("{logId}", String(logId)) };
}

