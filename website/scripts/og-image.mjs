/**
 * Genereerib OG-pildi (1200×630) lehe enda kujundusega.
 *
 * Miks skript, mitte käsitsi tehtud pilt: OG-pilt peab kandma sama sõnumit
 * ja sama tüpograafiat mis leht. Kui sõnum või värv muutub, tehakse pilt
 * uuesti ühe käsuga, mitte ei jää vana versioon jagamislinkidesse rippuma.
 *
 * Kasutab lehe enda self-hostitud fonte `public/fonts/` alt.
 *
 * Kasutus: node scripts/og-image.mjs
 */
import { chromium } from "playwright-core";
import { readFile, stat } from "node:fs/promises";

const OUT = "public/og.png";

const fontFile = async (name) => {
  const buf = await readFile(`public/fonts/${name}`);
  return `data:font/woff2;base64,${buf.toString("base64")}`;
};

const display = await fontFile("sofia-sans-condensed-latin-wght-italic.woff2");
const mono = await fontFile("geist-mono-latin-wght-normal.woff2");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: "D"; src: url("${display}") format("woff2-variations");
               font-weight: 1 1000; font-style: italic; }
  @font-face { font-family: "M"; src: url("${mono}") format("woff2-variations");
               font-weight: 100 900; font-style: normal; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #0b0b0d; color: #edeae3;
         font-family: "M", monospace; overflow: hidden; position: relative; }
  .grid { position: absolute; inset: 0;
          background-image: linear-gradient(#26262b 1px, transparent 1px),
                            linear-gradient(90deg, #26262b 1px, transparent 1px);
          background-size: 48px 48px; opacity: 0.35; }
  .ring { position: absolute; right: -140px; top: 50%; transform: translateY(-50%);
          width: 620px; height: 620px; border: 2px solid #ff5a00; border-radius: 50%;
          opacity: 0.55; }
  .dot { position: absolute; right: 150px; top: 50%; width: 16px; height: 16px;
         background: #35c46f; border-radius: 50%; transform: translate(50%, -50%); }
  .wrap { position: relative; padding: 64px 72px; height: 100%;
          display: flex; flex-direction: column; justify-content: space-between; }
  .mark { display: flex; align-items: center; gap: 14px; }
  .sq { width: 18px; height: 18px; background: #ff5a00; }
  .name { font-family: "D"; font-style: italic; font-weight: 900; font-size: 30px;
          text-transform: uppercase; letter-spacing: 0.01em; }
  h1 { font-family: "D"; font-style: italic; font-weight: 900; font-size: 116px;
       line-height: 0.84; text-transform: uppercase; letter-spacing: -0.015em;
       max-width: 15ch; }
  .accent { color: #ff5a00; }
  .foot { display: flex; gap: 28px; font-size: 15px; letter-spacing: 0.14em;
          text-transform: uppercase; color: #97938b; }
  .foot b { color: #edeae3; font-weight: 500; }
</style></head>
<body>
  <div class="grid"></div><div class="ring"></div><div class="dot"></div>
  <div class="wrap">
    <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
    <h1>Tunnid,<br>mis vastavad<br><span class="accent">tegelikkusele.</span></h1>
    <div class="foot">
      <span>Tööajaarvestus <b>ehitusettevõtetele</b></span>
      <span>Kontrollitud <b>serveris</b></span>
      <span><b>stp.nutisemud.ee</b></span>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: OUT });
await browser.close();

const { size } = await stat(OUT);
console.log(`✔ ${OUT} — 1200×630, ${(size / 1024).toFixed(0)} kB`);
