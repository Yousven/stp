import { Preferences } from "@capacitor/preferences";
import { ApiError, apiRequest } from "./client";
import { decideAction, type FlushState, type QueuedAction } from "./flushPlan";

export type { QueuedAction, FlushDecision, FlushState } from "./flushPlan";
export { decideAction } from "./flushPlan";

const QUEUE_KEY = "stp_offline_actions";


/**
 * Offline-järjekord tööaja registreerimiseks.
 *
 * Ehitusobjektil (kelder, metallkonstruktsioonid, maapiirkond) on levi
 * sageli olematu. Ilma selleta ei saaks töötaja üldse tööd alustada ja
 * kaotaks tunnid, mille eest ta ei saa midagi parata.
 *
 * Salvestame kasutaja tegevuse hetke (`occurredAt`) ja saadame selle
 * serverisse, kui ühendus taastub. Server kontrollib, et aeg oleks
 * mõistlik, ja märgib kellanihke, et kella nihutamine oleks nähtav.
 */
export async function readQueue(): Promise<QueuedAction[]> {
  const { value } = await Preferences.get({ key: QUEUE_KEY });
  if (!value) return [];
  try {
    return JSON.parse(value) as QueuedAction[];
  } catch {
    return [];
  }
}

async function writeQueue(actions: QueuedAction[]): Promise<void> {
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(actions) });
}

/** Lisab tegevuse järjekorda ja tagastab selle id (vt `dependsOn`). */
export async function enqueue(action: Omit<QueuedAction, "id">): Promise<string> {
  const queue = await readQueue();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  queue.push({ ...action, id });
  await writeQueue(queue);
  return id;
}

/**
 * Kas viga tähendab, et ühendus puudub?
 *
 * Serveri antud vastust (ApiError) EI tohi järjekorda panna — see on
 * sisuline keeldumine (nt "oled objektist liiga kaugel") ja kordamine ei
 * aitaks, ainult peidaks vea kasutaja eest.
 */
export function isOfflineError(err: unknown): boolean {
  return !(err instanceof ApiError);
}

export interface FlushResult {
  sent: number;
  failed: number;
  /** Serveri poolt lõplikult tagasi lükatud tegevused koos põhjusega. */
  rejected: Array<{ label: string; reason: string }>;
}

/**
 * Saadab järjekorra serverisse.
 *
 * Kolm tulemust igal kirjel:
 *  - õnnestus → eemaldatakse,
 *  - server keeldus (4xx) → eemaldatakse ja teatatakse kasutajale, sest
 *    kordamine annaks sama vastuse,
 *  - võrguviga → jääb järjekorda ja proovime hiljem uuesti.
 *
 * Sõltuvused (`dependsOn`) järgivad sama saatust: kui tööpäeva algus jäi
 * võrguvea tõttu saatmata, ootab ka lõpp; kui server algusest keeldus, pole
 * lõpul enam midagi külge panna ja see langeb koos algusega ära.
 */
export async function flushQueue(): Promise<FlushResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { sent: 0, failed: 0, rejected: [] };

  const remaining: QueuedAction[] = [];
  const rejected: FlushResult["rejected"] = [];
  let sent = 0;

  const state: FlushState = { resolvedIds: new Map(), deferred: new Set(), dead: new Set() };

  for (const action of queue) {
    const decision = decideAction(action, state);

    if (decision.kind === "defer") {
      remaining.push(action);
      state.deferred.add(action.id);
      continue;
    }
    if (decision.kind === "drop") {
      rejected.push({ label: action.label, reason: decision.reason });
      state.dead.add(action.id);
      continue;
    }

    try {
      const response = await apiRequest<{ id?: number }>(decision.path, {
        method: action.method,
        body: { ...action.body, occurredAt: action.occurredAt },
      });
      if (typeof response?.id === "number") state.resolvedIds.set(action.id, response.id);
      sent++;
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        rejected.push({ label: action.label, reason: err.message });
        state.dead.add(action.id);
      } else {
        remaining.push(action);
        state.deferred.add(action.id);
      }
    }
  }

  await writeQueue(remaining);
  return { sent, failed: remaining.length, rejected };
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}
