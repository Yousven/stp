import assert from "node:assert/strict";
import { test } from "node:test";
import { decideAction, type FlushState, type QueuedAction } from "./flushPlan";

function emptyState(): FlushState {
  return { resolvedIds: new Map(), deferred: new Set(), dead: new Set() };
}

function action(overrides: Partial<QueuedAction> = {}): QueuedAction {
  return {
    id: "a1",
    path: "/time-logs/start",
    method: "POST",
    body: {},
    occurredAt: "2026-08-25T08:00:00.000Z",
    label: "Tööpäeva alustamine",
    ...overrides,
  };
}

test("sõltuvuseta tegevus saadetakse alati muutmata teel", () => {
  const decision = decideAction(action(), emptyState());
  assert.deepEqual(decision, { kind: "send", path: "/time-logs/start" });
});

test("sõltuvusega tegevus saab kohatäite asemel serveri ID", () => {
  const state = emptyState();
  state.resolvedIds.set("start-1", 42);

  const decision = decideAction(
    action({ id: "end-1", path: "/time-logs/{logId}/end", dependsOn: "start-1" }),
    state
  );

  assert.deepEqual(decision, { kind: "send", path: "/time-logs/42/end" });
});

test("kui algus jäi võrguvea tõttu saatmata, ootab ka lõpp", () => {
  // Kõige olulisem juhtum: võrk kadus keset saatmist. Lõppu EI tohi ära
  // visata, muidu kaob töötaja tööpäeva lõpp jäädavalt.
  const state = emptyState();
  state.deferred.add("start-1");

  const decision = decideAction(
    action({ id: "end-1", path: "/time-logs/{logId}/end", dependsOn: "start-1" }),
    state
  );

  assert.equal(decision.kind, "defer");
});

test("kui server algusest keeldus, langeb lõpp koos sellega ära", () => {
  const state = emptyState();
  state.dead.add("start-1");

  const decision = decideAction(
    action({ id: "end-1", path: "/time-logs/{logId}/end", dependsOn: "start-1" }),
    state
  );

  assert.equal(decision.kind, "drop");
  assert.match(decision.kind === "drop" ? decision.reason : "", /alustamine ebaõnnestus/);
});

test("tundmatu sõltuvus ei jää igaveseks järjekorda rippuma", () => {
  // Ilma selleta prooviks orvuks jäänud lõpp iga flush'i juures uuesti ja
  // kasutaja ei saaks kunagi teada, et midagi on valesti.
  const decision = decideAction(
    action({ id: "end-1", path: "/time-logs/{logId}/end", dependsOn: "kadunud" }),
    emptyState()
  );

  assert.equal(decision.kind, "drop");
  assert.match(decision.kind === "drop" ? decision.reason : "", /ei leitud/);
});

test("edasilükkamine võidab keeldumise, kui sõltuvus on mõlemas hulgas", () => {
  // Kaitse selle vastu, et kontrollide järjekorra muutmine hakkaks vaikselt
  // päevi kustutama: kahtluse korral hoiame kirje alles.
  const state = emptyState();
  state.deferred.add("start-1");
  state.dead.add("start-1");

  const decision = decideAction(
    action({ id: "end-1", path: "/time-logs/{logId}/end", dependsOn: "start-1" }),
    state
  );

  assert.equal(decision.kind, "defer");
});
