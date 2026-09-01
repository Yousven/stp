/**
 * Äpi reklaamikomplekt — kasutusvoog nii, nagu rakendus päriselt töötab.
 *
 * Erineb `social-ads.mjs`-ist teadlikult: seal kannab sõnumit tüpograafia
 * ja tootekaader on tõend. SIIN on peaosas TELEFON — inimene peab nägema,
 * mida ta äpist saab, ja slaidid järgivad päris järjekorda:
 *
 *   objektile saabumine → kell käib → lahkumine peatab → tunnid kirjas
 *
 * Ükski kaader ei ole joonistatud. Kõik tulevad `website/src/assets/app/`
 * alt, mis omakorda tuleb päris rakendusest demoandmetega.
 *
 * Kasutus (website/ kaustast): node scripts/app-ads.mjs
 */
import { chromium } from "playwright-core";
import { readFile, mkdir, stat } from "node:fs/promises";

const WEB = new URL("../", import.meta.url).pathname;
const OUT = new URL("../../marketing/app/", import.meta.url).pathname;

const uri = async (path, mime) => {
  const buf = await readFile(path);
  return `data:${mime};base64,${buf.toString("base64")}`;
};

const display = await uri(`${WEB}public/fonts/sofia-sans-condensed-latin-wght-italic.woff2`, "font/woff2");
const bodyFont = await uri(`${WEB}public/fonts/geist-latin-wght-normal.woff2`, "font/woff2");
const mono = await uri(`${WEB}public/fonts/geist-mono-latin-wght-normal.woff2`, "font/woff2");

const shots = {
  start: await uri(`${WEB}src/assets/app/mobile-start.png`, "image/png"),
  active: await uri(`${WEB}src/assets/app/mobile-active.png`, "image/png"),
  away: await uri(`${WEB}src/assets/app/mobile-away.png`, "image/png"),
  history: await uri(`${WEB}src/assets/app/mobile-history.png`, "image/png"),
};

/** Allikkaadri mõõdud — kärpe arvutuse alus. */
const SHOT_W = 1170;
const SHOT_H = 2532;

const css = `
  @font-face { font-family: "D"; src: url("${display}") format("woff2-variations");
               font-weight: 1 1000; font-style: italic; }
  @font-face { font-family: "B"; src: url("${bodyFont}") format("woff2-variations");
               font-weight: 1 1000; font-style: normal; }
  @font-face { font-family: "M"; src: url("${mono}") format("woff2-variations");
               font-weight: 100 900; font-style: normal; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0b0b0d; color: #edeae3; font-family: "B", sans-serif;
         overflow: hidden; position: relative; }
  .grid { position: absolute; inset: 0; opacity: 0.28;
          background-image: linear-gradient(#26262b 1px, transparent 1px),
                            linear-gradient(90deg, #26262b 1px, transparent 1px);
          background-size: 64px 64px; }
  .wrap { position: relative; height: 100%; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .mark { display: flex; align-items: center; gap: 14px; }
  .sq { width: 18px; height: 18px; background: #ff5a00; flex: none; }
  .name { font-family: "D"; font-style: italic; font-weight: 900;
          text-transform: uppercase; letter-spacing: 0.01em; }
  .step { font-family: "M"; letter-spacing: 0.18em; text-transform: uppercase;
          color: #ff5a00; }
  h1 { font-family: "D"; font-style: italic; font-weight: 900; line-height: 0.86;
       text-transform: uppercase; letter-spacing: -0.015em; }
  .accent { color: #ff5a00; }
  .verified { color: #35c46f; }
  .stopped { color: #ff4457; }
  .sub { color: #97938b; }
  /* Telefoniraam on nurgeline, nagu kogu bränd — ümar mockup oleks
     täpselt see, mille järgi geneerilise SaaS-reklaami ära tunneb. */
  /* Mõõtu annab KÕRGUS, laius tuleb kärpe kuvasuhtest. Vastupidi
     (laius 100 %) venis telefon üle terve kaadri ja ekraanist paistis
     ainult ülemine serv. */
  .phone { border: 2px solid #3a3a42; overflow: hidden; background: #060607;
           width: auto; margin: 0 auto; flex: none; }
  .phone img { display: block; width: 100%; }
  .foot { display: flex; align-items: center; justify-content: space-between; }
  .domain { font-family: "M"; letter-spacing: 0.14em; text-transform: uppercase;
            color: #84807a; }
  .dots { display: flex; gap: 10px; }
  .dot { width: 10px; height: 10px; background: #3a3a42; }
  .dot.on { background: #ff5a00; }
  .cta { background: #ff5a00; color: #0b0b0d; font-family: "D"; font-style: italic;
         font-weight: 900; text-transform: uppercase; line-height: 1; }
`;

/**
 * Slaidid järgivad äpi päris voogu. Iga slaid ütleb ÜHE asja ja näitab
 * täpselt seda ekraani, kus see asi juhtub.
 */
const slides = [
  {
    id: "01-alusta",
    step: "Samm 01",
    title: `Alusta ainult<br><span class="verified">objektil.</span>`,
    lead: "Asukoht kontrollitakse enne, kui tööpäev algab.",
    shot: shots.start,
    /** Kui suur osa kaadri kõrgusest näidatakse — allpool on tühi ruum. */
    crop: 0.56,
  },
  {
    id: "02-kell-kaib",
    step: "Samm 02",
    title: `Kell käib,<br>kui oled <span class="verified">kohal.</span>`,
    lead: "Tunnid koguvad ainult objektil viibitud aja pealt.",
    shot: shots.active,
    crop: 0.78,
  },
  {
    id: "03-kell-peatub",
    step: "Samm 03",
    title: `Lahkud —<br><span class="stopped">kell peatub.</span>`,
    lead: "Ise. Keegi ei pea midagi vajutama ega meeles pidama.",
    shot: shots.away,
    crop: 0.78,
  },
  {
    id: "04-tunnid-kirjas",
    step: "Samm 04",
    title: `Iga päev<br>on <span class="accent">kirjas.</span>`,
    lead: "Objekt, kellaajad ja tunnid — nädalate kaupa.",
    shot: shots.history,
    crop: 0.92,
  },
  {
    id: "05-proovi",
    step: "Kokkuvõte",
    title: `Proovi<br><span class="accent">14 päeva tasuta.</span>`,
    lead: "iOS, Android ja arvutiliides brauseris. Neli keelt.",
    shot: null,
    crop: 0,
    /*
     * Lõppslaid EI ütle "Laadi alla" — äpp ei ole veel poes ja vale
     * lubadus toob kliendi, kes esimese klikiga pettub. CTA on sama mis
     * lehel: proovi tasuta, aadressilt.
     */
    closing: true,
  },
];

/**
 * Mõõdud. Poe-kaader on kitsam ja kõrgem, seega tüpograafia on seal
 * väiksem ja telefon suurem — App Store'is on pilt ise põhisisu.
 */
const sizes = [
  { id: "feed", width: 1080, height: 1350, pad: 64, name: 30, step: 20, h1: 84, lead: 30, phone: 0.52 },
  { id: "story", width: 1080, height: 1920, pad: 72, name: 32, step: 22, h1: 96, lead: 32, phone: 0.55 },
  { id: "store", width: 1290, height: 2796, pad: 90, name: 36, step: 26, h1: 108, lead: 36, phone: 0.62 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

for (const [index, slide] of slides.entries()) {
  for (const size of sizes) {
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });

    const dots = slides
      .map((_, i) => `<span class="dot${i === index ? " on" : ""}"></span>`)
      .join("");

    // Kärbe: näitame kaadri ülemist osa, sest allpool on tühi ekraan.
    const phone = slide.shot
      ? `<div class="phone" style="aspect-ratio:${SHOT_W} / ${Math.round(SHOT_H * slide.crop)}">
           <img src="${slide.shot}" alt="">
         </div>`
      : `<div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;flex:1;gap:${size.pad * 0.5}px">
           <div>
             <span class="step" style="font-size:${size.step}px">Hind</span>
             <div class="hero-price" style="font-family:'D';font-style:italic;font-weight:900;
                  font-size:${size.h1 * 2.4}px;line-height:0.8;letter-spacing:-0.015em;margin-top:${size.pad * 0.2}px">5 €</div>
             <span class="step" style="font-size:${size.step}px;color:#84807a">Kasutaja / kuu</span>
           </div>
           <span class="cta" style="font-size:${size.h1 * 0.55}px;padding:${size.pad * 0.3}px ${size.pad * 0.45}px">
             Proovi tasuta
           </span>
         </div>`;

    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}
        html,body{width:${size.width}px;height:${size.height}px}
        .wrap{padding:${size.pad}px;gap:${size.pad * 0.55}px}
        .name{font-size:${size.name}px}
        .step{font-size:${size.step}px}
        h1{font-size:${size.h1}px}
        .lead{font-size:${size.lead}px;line-height:1.35;max-width:26ch}
        .domain{font-size:${size.step}px}
        .phone{height:${Math.round(size.height * size.phone)}px}
       </style></head><body>
        <div class="grid"></div>
        <div class="wrap">
          <div class="top">
            <div class="mark"><span class="sq"></span><span class="name">SmartTimePlanning</span></div>
            <span class="step">${slide.step}</span>
          </div>
          <div>
            <h1>${slide.title}</h1>
            <p class="lead sub" style="margin-top:${size.pad * 0.4}px">${slide.lead}</p>
          </div>
          ${phone}
          <div class="foot" style="margin-top:auto">
            <div class="dots">${dots}</div>
            <span class="domain">stp.nutisemud.ee</span>
          </div>
        </div>
       </body></html>`,
      { waitUntil: "load" },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const file = `${OUT}${slide.id}-${size.id}.png`;
    await page.screenshot({ path: file });
    const { size: bytes } = await stat(file);
    console.log(`✔ ${slide.id}-${size.id}.png  ${size.width}×${size.height}  ${(bytes / 1024).toFixed(0)} kB`);
    await page.close();
  }
}

await browser.close();
console.log(`\n${slides.length} slaidi × ${sizes.length} mõõtu → marketing/app/`);
