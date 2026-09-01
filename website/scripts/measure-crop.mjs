/**
 * Mõõdab arvutiliidese tõmmistelt külgmenüü täpse laiuse.
 *
 * Miks skript: S4, S5 ja S8 kärbivad külgmenüü tõmmiselt maha ja
 * kärpenumber peab olema MÕÕDETUD, mitte äpi CSS-ist tuletatud. Tuletatud
 * number (`.desktop-shell` → `17rem`) andis 272 px, tegelik äärejoon on
 * 288 px juures — vahe jättis menüü servariba kaadrisse paistma.
 *
 * Kui tõmmised uuesti tehakse (`capture-app-ui.mjs`), jookseta see üle ja
 * uuenda `width` / `margin-left` väärtused sektsioonides.
 *
 * Eeldab, et leht jookseb pordil 4321.
 * Kasutus: node scripts/measure-crop.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.env.SITE_URL ?? "http://localhost:4321";
const SHOTS = ["desktop-overview", "desktop-billing", "desktop-worktypes"];
/** Tõmmise loogiline laius (allikas on 2× sellest). */
const LOGICAL_WIDTH = 1440;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

// Pildid on laisad — keri leht läbi, muidu ei ole `currentSrc` täidetud.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.6;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
});
await page.waitForTimeout(1200);

for (const name of SHOTS) {
  const r = await page.evaluate(
    async ({ name, logicalWidth }) => {
      const img = [...document.querySelectorAll("img")].find((i) => i.currentSrc.includes(name));
      if (!img) return { error: "pilti ei ole lehel" };

      const blob = await fetch(img.currentSrc).then((res) => res.blob());
      const bmp = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0);

      // Rida sisuala kõrguselt, kus külgmenüü on kindlasti olemas.
      const row = ctx.getImageData(0, Math.round(bmp.height * 0.55), bmp.width, 1).data;
      const scale = bmp.width / logicalWidth;

      // Külgmenüü äärejoon on esimene selge heleduse hüpe vasakult.
      for (let x = 1; x < Math.min(bmp.width, 900); x++) {
        const delta =
          Math.abs(row[x * 4] - row[(x - 1) * 4]) + Math.abs(row[x * 4 + 1] - row[(x - 1) * 4 + 1]);
        if (delta > 6) return { border: +(x / scale).toFixed(1), width: bmp.width };
      }
      return { error: "äärejoont ei leidnud" };
    },
    { name, logicalWidth: LOGICAL_WIDTH },
  );

  if (r.error) {
    console.log(`${name}: ${r.error}`);
    continue;
  }
  const crop = Math.ceil(r.border) + 2; // paar pikslit varu, et joon ei jääks
  const content = LOGICAL_WIDTH - crop;
  console.log(
    `${name}: äärejoon ${r.border} → kärbi ${crop}, sisuveerg ${content}\n` +
      `   täislaiuses kaadris:  width: ${((LOGICAL_WIDTH / content) * 100).toFixed(1)}%  ` +
      `margin-left: -${((crop / content) * 100).toFixed(1)}%`,
  );
}

await browser.close();
