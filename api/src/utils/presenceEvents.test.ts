import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decidePresenceEvent, type PresenceContext } from "./presenceEvents.js";

const site = { latitude: 58.3742, longitude: 26.718, radius: 100 };
const onSite = { latitude: 58.3742, longitude: 26.718 };
/** ~5 km põhja pool. */
const atHome = { latitude: 58.3742 + 5000 / 111_320, longitude: 26.718 };

const START = new Date("2026-03-10T08:00:00Z");
const NOW = new Date("2026-03-10T12:00:00Z");

function ctx(overrides: Partial<PresenceContext> = {}): PresenceContext {
  return {
    logStart: START,
    logEnd: null,
    object: site,
    now: NOW,
    futureToleranceMs: 5 * 60 * 1000,
    ...overrides,
  };
}

const at = (iso: string) => new Date(iso);

describe("EXIT — peatab kella, seega vastu ilma asukohakontrollita", () => {
  test("ilma koordinaatideta võetakse vastu", () => {
    const d = decidePresenceEvent({ type: "EXIT", occurredAt: at("2026-03-10T10:00:00Z") }, ctx());
    assert.equal(d.accept, true);
  });

  test("objektist kaugelt võetakse vastu — EXIT saab tunde ainult vähendada", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T10:00:00Z"), ...atHome },
      ctx()
    );
    assert.equal(d.accept, true);
  });

  test("lõpetatud päeva sisse jäävat EXIT-i võetakse vastu (hiline natiivne sündmus)", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T10:00:00Z") },
      ctx({ logEnd: at("2026-03-10T11:00:00Z") })
    );
    assert.equal(d.accept, true);
  });
});

describe("ENTER — paneb kella käima, seega tõendatud nagu alustamine", () => {
  test("objektil olles võetakse vastu", () => {
    const d = decidePresenceEvent(
      { type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z"), ...onSite },
      ctx()
    );
    assert.equal(d.accept, true);
  });

  test("kodust saadetud ENTER lükatakse tagasi", () => {
    const d = decidePresenceEvent(
      { type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z"), ...atHome },
      ctx()
    );
    assert.deepEqual(d, { accept: false, reason: "too-far" });
  });

  test("ENTER ilma koordinaatideta lükatakse tagasi", () => {
    const d = decidePresenceEvent({ type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z") }, ctx());
    assert.deepEqual(d, { accept: false, reason: "no-location" });
  });

  test("suur täpsus ei tee kaugelt saadetud ENTER-it kehtivaks", () => {
    const d = decidePresenceEvent(
      { type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z"), ...atHome, accuracy: 50_000 },
      ctx()
    );
    assert.deepEqual(d, { accept: false, reason: "too-far" });
  });

  test("mõistlik täpsus lubab piiri lähedal olla", () => {
    const nearEdge = { latitude: site.latitude + 150 / 111_320, longitude: site.longitude };
    const d = decidePresenceEvent(
      { type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z"), ...nearEdge, accuracy: 80 },
      ctx()
    );
    assert.equal(d.accept, true);
  });

  test("lõpetatud tööpäeva ei panda uuesti käima", () => {
    const d = decidePresenceEvent(
      { type: "ENTER", occurredAt: at("2026-03-10T10:00:00Z"), ...onSite },
      ctx({ logEnd: at("2026-03-10T11:00:00Z") })
    );
    assert.deepEqual(d, { accept: false, reason: "log-closed" });
  });
});

describe("Ajaaken", () => {
  test("tuleviku ajatempel lükatakse tagasi", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T13:00:00Z") },
      ctx()
    );
    assert.deepEqual(d, { accept: false, reason: "future" });
  });

  test("väike kellanihe on lubatud", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T12:02:00Z") },
      ctx()
    );
    assert.equal(d.accept, true);
  });

  test("enne tööpäeva algust jääv sündmus lükatakse tagasi", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T07:00:00Z") },
      ctx()
    );
    assert.deepEqual(d, { accept: false, reason: "outside-window" });
  });

  test("pärast tööpäeva lõppu jääv sündmus lükatakse tagasi", () => {
    const d = decidePresenceEvent(
      { type: "EXIT", occurredAt: at("2026-03-10T11:30:00Z") },
      ctx({ logEnd: at("2026-03-10T11:00:00Z") })
    );
    assert.deepEqual(d, { accept: false, reason: "outside-window" });
  });
});
