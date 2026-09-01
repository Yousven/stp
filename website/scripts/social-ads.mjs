/**
 * Sotsiaalmeedia reklaamipildid.
 *
 * Miks skript, mitte käsitsi tehtud pildid: reklaam kannab sama sõnumit,
 * tüpograafiat ja värve mis turundusleht. Kui sõnum või hind muutub, tuleb
 * komplekt uuesti ühe käsuga, mitte ei jää vana versioon Facebooki ringlema.
 *
 * Kasutab turunduslehe self-hostitud fonte ja PÄRIS tootekaadreid
 * (`website/src/assets/app/`) — joonistatud UI-d siin ei ole, sama reegel
 * mis lehel.
 *
 * Skript elab `website/scripts/` all, sest ta kasutab turunduslehe fonte,
 * tootekaadreid ja playwrighti — eraldi kaustas oleks vaja teist
 * `node_modules`-i sama asja jaoks. Valmis pildid lähevad `marketing/`
 * alla, sest need EI ole veebilehe osa.
 *
 * Kasutus (website/ kaustast): node scripts/social-ads.mjs
 */
import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import { stat } from "node:fs/promises";

const WEB = new URL("../", import.meta.url).pathname;
const OUT = new URL("../../marketing/social/", import.meta.url).pathname;

const asDataUri = async (path, mime) => {
  const buf = await readFile(path);
  return `data:${mime};base64,${buf.toString("base64")}`;
};

const display = await asDataUri(
  `${WEB}public/fonts/sofia-sans-condensed-latin-wght-italic.woff2`,
  "font/woff2",
);
const body = await asDataUri(`${WEB}public/fonts/geist-latin-wght-normal.woff2`, "font/woff2");
const mono = await asDataUri(`${WEB}public/fonts/geist-mono-latin-wght-normal.woff2`, "font/woff2");

const shot = {
  away: await asDataUri(`${WEB}src/assets/app/mobile-away.png`, "image/png"),
  active: await asDataUri(`${WEB}src/assets/app/mobile-active.png`, "image/png"),
  overview: await asDataUri(`${WEB}src/assets/app/desktop-overview.png`, "image/png"),
};

/** Ühine kujundus. Värvid ja tüpograafia on turunduslehe tokenitest. */
const base = `
  @font-face { font-family: "D"; src: url("${display}") format("woff2-variations");
               font-weight: 1 1000; font-style: italic; }
  @font-face { font-family: "B"; src: url("${body}") format("woff2-variations");
               font-weight: 1 1000; font-style: normal; }
  @font-face { font-family: "M"; src: url("${mono}") format("woff2-variations");
               font-weight: 100 900; font-style: normal; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0b0b0d; color: #edeae3; font-family: "B", sans-serif;
         overflow: hidden; position: relative; }
  .grid { position: absolute; inset: 0; opacity: 0.3;
          background-image: linear-gradient(#26262b 1px, transparent 1px),
                            linear-gradient(90deg, #26262b 1px, transparent 1px);
          background-size: 64px 64px; }
  .wrap { position: relative; height: 100%; display: flex; flex-direction: column;
          justify-content: space-between; padding: 72px 64px; }
  /* Keskmine plokk täidab kogu vaba ruumi ja tsentreerib end selles.
     Ilma selleta rippus lühem sõnum üleval ja alla jäi suur tühi riba. */
  .mid { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .mark { display: flex; align-items: center; gap: 16px; }
  .sq { width: 22px; height: 22px; background: #ff5a00; flex: none; }
  .name { font-family: "D"; font-style: italic; font-weight: 900; font-size: 34px;
          text-transform: uppercase; letter-spacing: 0.01em; }
  h1 { font-family: "D"; font-style: italic; font-weight: 900; line-height: 0.84;
       text-transform: uppercase; letter-spacing: -0.015em; }
  .accent { color: #ff5a00; }
  .verified { color: #35c46f; }
  .stopped { color: #ff4457; }
  .hud { font-family: "M"; font-size: 20px; letter-spacing: 0.16em;
         text-transform: uppercase; color: #84807a; }
  .lead { font-size: 34px; line-height: 1.35; color: #97938b; max-width: 22ch; }
  .foot { display: flex; align-items: center; gap: 20px; }
  .cta { background: #ff5a00; color: #0b0b0d; font-family: "D"; font-style: italic;
         font-weight: 900; font-size: 38px; text-transform: uppercase;
         padding: 18px 28px; line-height: 1; }
  .domain { font-family: "M"; font-size: 22px; letter-spacing: 0.14em;
            text-transform: uppercase; color: #edeae3; }
  .phone { border: 2px solid #3a3a42; overflow: hidden; }
  .phone img { display: block; width: 100%; }
`;

/**
 * Reklaamid.
 *
 * Iga pilt kannab ÜHT mõtet. Söötmes on aega umbes sekund — kaks sõnumit
 * ühel pildil tähendab, et kumbagi ei loeta.
 */
const ads = [
  {
    id: "01-vastuolu",
    note: "Põhikonflikt: kirja pandud tunnid vs objektil oldud aeg.",
    html: `
      <div class="grid"></div>
      <div class="wrap">
        <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
        <div class="mid">
          <h1 style="font-size:150px">10 h kirjas.<br><span class="stopped">5 h objektil.</span></h1>
          <p class="lead" style="margin-top:48px">
            Tööaeg, mille taga on kontrollitav jälg — mitte mälu järgi täidetud tabel.
          </p>
        </div>
        <div class="foot"><span class="cta">Proovi tasuta</span><span class="domain">stp.nutisemud.ee</span></div>
      </div>`,
  },
  {
    id: "02-kell-peatub",
    note: "Automaatika: objektilt lahkumine peatab kella ise.",
    html: `
      <div class="grid"></div>
      <div class="wrap">
        <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
        <div class="mid" style="flex-direction:row;gap:56px;align-items:center">
          <div style="flex:1">
            <h1 style="font-size:104px">Lahkub<br>objektilt.<br><span class="accent">Kell peatub.</span></h1>
            <p class="lead" style="margin-top:40px;font-size:30px">
              Keegi ei pea midagi vajutama ega meeles pidama.
            </p>
          </div>
          <div class="phone" style="width:340px;flex:none"><img src="${shot.away}" alt=""></div>
        </div>
        <div class="foot"><span class="cta">Proovi tasuta</span><span class="domain">stp.nutisemud.ee</span></div>
      </div>`,
  },
  {
    id: "03-haldur",
    note: "Halduri vaade: kes on praegu objektil.",
    html: `
      <div class="grid"></div>
      <div class="wrap">
        <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
        <div class="mid">
          <h1 style="font-size:112px">Kes on<br>praegu<br><span class="verified">objektil?</span></h1>
          <!-- Kärbe MÕÕDETUD allikast (1440 lai): "Praegu tööl" kaart on
              x 311–1414, y 102–402. Terve arvutivaate näitamine teeks
              teksti söötmes loetamatuks ja lõikaks just tunnid ära. -->
          <div style="margin-top:44px;border:2px solid #3a3a42;overflow:hidden;aspect-ratio:1103/300">
            <img src="${shot.overview}"
                 style="display:block;width:130.6%;margin-left:-28.2%;margin-top:-9.2%" alt="">
          </div>
        </div>
        <div class="foot"><span class="cta">Proovi tasuta</span><span class="domain">stp.nutisemud.ee</span></div>
      </div>`,
  },
  {
    id: "04-kuu-lopp",
    note: "Kuu lõpp ilma Exceli detektiivitööta.",
    html: `
      <div class="grid"></div>
      <div class="wrap">
        <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
        <div class="mid">
          <span class="hud">Kuu lõpp</span>
          <h1 style="font-size:126px;margin-top:24px">Ilma<br>Exceli<br><span class="accent">detektiivi&shy;tööta.</span></h1>
          <p class="lead" style="margin-top:44px">
            Tunnid on juba koos. Palgaarvestus ja kliendiarve tulevad samast andmestikust.
          </p>
        </div>
        <div class="foot"><span class="cta">Proovi tasuta</span><span class="domain">stp.nutisemud.ee</span></div>
      </div>`,
  },
  {
    id: "05-hind",
    note: "Hind ja prooviperiood. Numbrid tulevad tootest.",
    html: `
      <div class="grid"></div>
      <div class="wrap">
        <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
        <div class="mid">
          <span class="hud">Hind</span>
          <h1 style="font-size:400px;margin-top:8px;line-height:0.78">5 €</h1>
          <p class="hud" style="font-size:30px;margin-top:20px">Kasutaja / kuu</p>
          <p class="lead" style="margin-top:40px">
            Üks hind, ilma astmeteta. Esimesed 14 päeva tasuta.
          </p>
        </div>
        <div class="foot"><span class="cta">Proovi tasuta</span><span class="domain">stp.nutisemud.ee</span></div>
      </div>`,
  },
];

/** Söötme- ja lugude mõõdud. */
const sizes = [
  { id: "feed", width: 1080, height: 1350 },
  { id: "story", width: 1080, height: 1920 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

for (const ad of ads) {
  for (const size of sizes) {
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>${base}
       html,body{width:${size.width}px;height:${size.height}px}
       /* Lugude formaat on kõrgem — rohkem õhku, sama tüpograafia. */
       .wrap{padding:${size.id === "story" ? "140px 72px" : "72px 64px"}}
       </style></head><body>${ad.html}</body></html>`,
      { waitUntil: "load" },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const file = `${OUT}${ad.id}-${size.id}.png`;
    await page.screenshot({ path: file });
    const { size: bytes } = await stat(file);
    console.log(`✔ ${ad.id}-${size.id}.png  ${size.width}×${size.height}  ${(bytes / 1024).toFixed(0)} kB`);
    await page.close();
  }
}

await browser.close();
console.log(`\n${ads.length} reklaami × ${sizes.length} mõõtu → marketing/social/`);
