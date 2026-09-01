import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isDeviceMismatch } from "./securityAlerts.js";

describe("isDeviceMismatch", () => {
  test("sama seade ei ole kahtlane", () => {
    assert.equal(isDeviceMismatch("abc", "abc"), false);
  });

  test("teine seade on kahtlane", () => {
    assert.equal(isDeviceMismatch("abc", "xyz"), true);
  });

  test("puuduv alustamise seade ei tekita märget", () => {
    // Vana kirje, mis loodi enne seadme sidumist.
    assert.equal(isDeviceMismatch(null, "xyz"), false);
  });

  test("puuduv praegune seade ei tekita märget", () => {
    // Arvutiliides või vana äpp, mis päist ei saada.
    assert.equal(isDeviceMismatch("abc", undefined), false);
  });

  test("mõlema puudumine ei tekita märget", () => {
    assert.equal(isDeviceMismatch(null, null), false);
  });

  test("tühi string loeb puuduvaks, mitte erinevaks", () => {
    // Muidu annaks tühi päis igale päringule märke.
    assert.equal(isDeviceMismatch("abc", ""), false);
  });
});
