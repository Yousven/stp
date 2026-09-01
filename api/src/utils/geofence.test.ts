import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkGeofence, distanceMeters, MAX_ACCURACY_ALLOWANCE_METERS } from "./geofence.js";

/** Demo-objekt. Raadius on tahtlikult väike, et piir oleks testides selge. */
const site = { latitude: 58.3742, longitude: 26.718, radius: 100 };

/** Nihutab punkti põhja poole antud meetrite võrra. */
function north(meters: number) {
  return { latitude: site.latitude + meters / 111_320, longitude: site.longitude };
}

describe("distanceMeters", () => {
  test("sama punkt annab nulli", () => {
    assert.equal(Math.round(distanceMeters(58.3742, 26.718, 58.3742, 26.718)), 0);
  });

  test("teadaolev vahemaa tuleb õige ±1 m täpsusega", () => {
    const d = distanceMeters(site.latitude, site.longitude, north(250).latitude, north(250).longitude);
    assert.ok(Math.abs(d - 250) < 1, `sai ${d}`);
  });
});

describe("checkGeofence", () => {
  test("objekti keskel on sees", () => {
    assert.equal(checkGeofence(site, { ...site }).inside, true);
  });

  test("raadiuse sees on sees", () => {
    assert.equal(checkGeofence(site, north(80)).inside, true);
  });

  test("raadiusest väljas on väljas", () => {
    assert.equal(checkGeofence(site, north(160)).inside, false);
  });

  test("täpsus laiendab raadiust", () => {
    // 160 m on väljas, aga 80 m täpsusega mahub 100 + 80 sisse.
    assert.equal(checkGeofence(site, { ...north(160), accuracy: 80 }).inside, true);
  });

  test("täpsuse varu on ülalt piiratud", () => {
    // Ilma ülempiirita saaks klient teatada suvalise täpsuse ja olla
    // "objektil" ükskõik kust. 5 km kaugusel ei aita ka 50 km täpsus.
    const far = north(5000);
    assert.equal(checkGeofence(site, { ...far, accuracy: 50_000 }).inside, false);
    assert.equal(checkGeofence(site, { ...far, accuracy: 50_000 }).allowance, MAX_ACCURACY_ALLOWANCE_METERS);
  });

  test("negatiivne täpsus ei vähenda raadiust", () => {
    assert.equal(checkGeofence(site, { ...north(80), accuracy: -500 }).inside, true);
  });

  test("puuduv täpsus tähendab varu puudumist", () => {
    const r = checkGeofence(site, north(120));
    assert.equal(r.allowance, 0);
    assert.equal(r.inside, false);
  });

  test("täpselt piiril on sees", () => {
    const r = checkGeofence(site, north(100));
    assert.equal(r.inside, true);
  });
});
