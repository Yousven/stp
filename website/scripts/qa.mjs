/**
 * Brauseri-QA kogu lehele.
 *
 * Ei ole osa saidist ega buildist — see on tööriist, mis kontrollib seda,
 * mida build ei näe: ülevool, konsoolivead, puuduvad varad, katkised
 * pealkirjad, liikumise vähendamine ja pinnitud sektsioonide käitumine.
 *
 * Eeldab, et leht jookseb pordil 4321 (`npm run dev`) või et
 * `SITE_URL` osutab mujale — nt `node scripts/serve-dist.mjs`, mis
 * serveerib buildi koos `_headers` failist tulevate turvapäistega.
 *
 * Kasutus: node scripts/qa.mjs [--shots] [--webkit]
 *   --webkit  jookseb Safari mootoril (WebKit) Chrome'i asemel
 */
import { chromium, webkit } from "playwright-core";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SITE_URL ?? "http://localhost:4321";
const WITH_SHOTS = process.argv.includes("--shots");
/** Safari mootor. Sama komplekt, teine renderdaja. */
const USE_WEBKIT = process.argv.includes("--webkit");
const OUT = ".review";

const LOCALES = { et: "/", en: "/en/", ru: "/ru/", uk: "/uk/" };
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];

/*
 * Elemendid, mille algseisu GSAP peidab.
 *
 * Kaks asja peavad nende kohta kehtima ja mõlemat on lihtne märkamatult
 * katki teha:
 *   1. liikumise vähendamisel EI peideta neid kunagi (CSS on lõppseis);
 *   2. tavarežiimis jõuavad nad kerimise lõpuks lõppseisu.
 *
 * Teine punkt on `scrub`-arhitektuuri ainus päris oht: kui trigger'i `end`
 * ei ole saavutatav (nt lehe viimane sektsioon), jääks sisu poolenisti
 * peitu ja seda ei näitaks ei build ega tüübikontroll.
 */
const ANIMATED = [
  ".proof__line", ".proof__verdict", ".chain__step",
  ".admin__line", ".admin__crop", ".admin__legend-item", ".admin__caption", ".admin__body",
  ".caps__heading-line", ".caps__index", ".caps__title", ".caps__body", ".caps__zoom",
  ".caps__detail-cap",
  ".trust__heading-line", ".trust__body", ".trust__chain-index", ".trust__chain-name", ".trust__point-title",
  ".trust__point-body", ".trust__disclaimer",
  ".offline__heading-line", ".offline__body", ".offline__state-label", ".offline__state-note",
  ".offline__caveat",
  ".bill__heading-line", ".bill__flow-index", ".bill__flow-name", ".bill__crop", ".bill__caption", ".bill__body",
  ".bill__rule-title", ".bill__rule-body",
  ".price__heading-line", ".price__amount", ".price__per", ".price__trial", ".price__body",
  ".price__include", ".price__cta",
  ".faq__heading-line", ".faq__item",
  ".final__line", ".final__body", ".final__cta", ".foot__row",
];

/*
 * S1–S3 pinnitud jutustuse osad, mille LÕPPSEIS ei olegi "kõik nähtav":
 * ahelas on korraga näha üks samm ja S2 esimene rida tuhmub tahtlikult,
 * kui otsus kohale jõuab. Liikumise vähendamisel peavad nad siiski kõik
 * nähtavad olema, seega välistame nad ainult kerimise lõppseisu kontrollist.
 */
const PINNED_STORY = [".proof__line", ".proof__verdict", ".chain__step"];
const SETTLED = ANIMATED.filter((sel) => !PINNED_STORY.includes(sel));

/** Jooned, mis tõmmatakse `scaleX`/`scaleY`-ga 0-st 1-ni. */
const DRAWN = [
  ".admin__legend-rule", ".caps__rule", ".trust__chain-progress", ".trust__point-rule",
  ".offline__state-rule", ".bill__flow-progress", ".bill__rule-line", ".price__rule",
  ".faq__rule",
];

const browser = USE_WEBKIT ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
console.log(USE_WEBKIT ? "mootor: WebKit (Safari)" : "mootor: Chrome");
if (WITH_SHOTS) await mkdir(OUT, { recursive: true });

/**
 * Dev-tööriistariba on olemas ainult dev-serveril. Buildi vastu joostes
 * seda ei ole — ja seal on range CSP, mis inline-stiili niikuinii keelab.
 * Süstime seetõttu ainult siis, kui riba päriselt olemas on.
 */
async function hideDevToolbar(page) {
  const present = await page
    .locator("astro-dev-toolbar")
    .count()
    .then((n) => n > 0)
    .catch(() => false);
  if (!present) return;
  await page.addStyleTag({ content: "astro-dev-toolbar{display:none !important}" }).catch(() => {});
}

let problems = 0;
const note = (msg) => {
  problems++;
  console.log(`✗ ${msg}`);
};

/** Ülevool, katkised pealkirjad ja puuduvad varad igas keeles ja laiuses. */
for (const [lang, path] of Object.entries(LOCALES)) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: "dark",
    });
    const page = await context.newPage();

    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().split("/").pop()}`);
    });

    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await hideDevToolbar(page);
    await page.waitForTimeout(1200);

    // Keri leht läbi, et lazy-pildid ja ScrollTriggerid käivituksid.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const overflow = [];
      // Pealkirjaread on `nowrap` — just siin läheb tekst kastist välja.
      document
        .querySelectorAll(
          ".hero__line-in, .proof__line, .proof__verdict, .chain__title-line, " +
            ".admin__line, .caps__heading-line, .trust__heading-line, " +
            ".offline__heading-line, .bill__heading-line, .price__heading-line, " +
            ".faq__heading-line, .final__line"
        )
        .forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 1) {
            overflow.push(`${el.textContent.trim().slice(0, 22)} (${el.scrollWidth}>${el.clientWidth})`);
          }
        });

      const headings = [...document.querySelectorAll("h1,h2,h3")].map((h) => h.tagName);
      const imagesWithoutAlt = [...document.querySelectorAll("img")].filter(
        (img) => img.alt === null || img.getAttribute("alt") === null
      ).length;
      const brokenImages = [...document.querySelectorAll("img")].filter(
        (img) => img.complete && img.naturalWidth === 0
      ).length;
      // Laisk pilt, mis on juba vaateaknast läbi keritud, peab olema laetud.
      // Peidetud pilte (nt sammu 02 dubleeriv telefon mobiilis) EI loeta:
      // `display: none` pilt ei laadigi laisalt ja see on õige käitumine.
      const notLoaded = [...document.querySelectorAll("img")]
        .filter((img) => !img.complete && img.getBoundingClientRect().width > 0)
        .map((img) => (img.currentSrc || img.src).split("?")[0].split("/").pop());

      return {
        overflow,
        docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        docW: document.documentElement.scrollWidth,
        viewW: document.documentElement.clientWidth,
        h1Count: headings.filter((h) => h === "H1").length,
        imagesWithoutAlt,
        brokenImages,
        notLoaded,
      };
    });

    const tag = `${lang}@${width}`;
    if (result.docOverflow) note(`${tag}: leht keriks külgsuunas (${result.docW} > ${result.viewW})`);
    if (result.overflow.length) note(`${tag}: pealkiri üle serva — ${result.overflow.join(" | ")}`);
    if (result.h1Count !== 1) note(`${tag}: h1 arv on ${result.h1Count}, peab olema 1`);
    if (result.imagesWithoutAlt) note(`${tag}: ${result.imagesWithoutAlt} pilti ilma alt-atribuudita`);
    if (result.brokenImages) note(`${tag}: ${result.brokenImages} katkist pilti`);
    if (result.notLoaded.length) note(`${tag}: laadimata pildid — ${result.notLoaded.join(", ")}`);
    if (consoleErrors.length) note(`${tag}: konsoolivead — ${consoleErrors.slice(0, 2).join(" | ")}`);
    if (failedRequests.length) note(`${tag}: päringud 4xx/5xx — ${failedRequests.slice(0, 3).join(" | ")}`);

    await context.close();
  }
}

/** Liikumise vähendamine: sisu peab olema täielikult nähtav ja pinnita. */
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await hideDevToolbar(page);
  await page.waitForTimeout(1500);

  const r = await page.evaluate((animated) => {
    const hidden = [];
    document.querySelectorAll(animated.join(", ")).forEach((el) => {
      const cs = getComputedStyle(el);
      if (Number(cs.opacity) < 0.9) hidden.push(el.className.split(" ")[0]);
    });
    // Pin lisab ScrollTriggeri vahedistantsi; liikumise vähendamisel ei tohi
    // seda olla, muidu jääks kasutaja tühja kerimisse kinni.
    const pinSpacers = document.querySelectorAll(".pin-spacer").length;
    return { hidden: [...new Set(hidden)], pinSpacers };
  }, ANIMATED);

  if (r.hidden.length) note(`reduced-motion: peidetud sisu — ${r.hidden.join(", ")}`);
  if (r.pinSpacers) note(`reduced-motion: ${r.pinSpacers} pin-spacer'it, pinni ei tohiks olla`);
  await context.close();
}

/**
 * Kerimise lõpus peab KÕIK olema lõppseisus.
 *
 * See tabab täpselt selle vea, mida ükski muu kontroll ei näe: `scrub`
 * ajajoon, mille `end` jääb lehe kerimisulatusest välja, jätaks sisu
 * igaveseks poolläbipaistvaks või maski taha.
 */
for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await hideDevToolbar(page);
  await page.waitForTimeout(1200);

  await page.evaluate(async () => {
    const step = window.innerHeight * 0.5;
    for (let y = 0; y < document.body.scrollHeight + window.innerHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 1400));
  });

  const stuck = await page.evaluate(
    ({ animated, drawn }) => {
      const out = [];
      for (const sel of animated)
        document.querySelectorAll(sel).forEach((el, i) => {
          const cs = getComputedStyle(el);
          if (parseFloat(cs.opacity) < 0.9) out.push(`${sel}[${i}] opacity ${cs.opacity}`);
          if (/inset/.test(cs.clipPath) && /(?:9\d|100)%/.test(cs.clipPath))
            out.push(`${sel}[${i}] clip ${cs.clipPath}`);
        });
      for (const sel of drawn)
        document.querySelectorAll(sel).forEach((el, i) => {
          // `matrix(a, b, c, d, e, f)` — skaala on esimese kahe veeru pikkus.
          const t = getComputedStyle(el).transform;
          const n = t.startsWith("matrix(") ? t.slice(7, -1).split(",").map(Number) : null;
          const sx = n ? Math.hypot(n[0], n[1]) : 1;
          const sy = n ? Math.hypot(n[2], n[3]) : 1;
          if (sx < 0.9 && sy < 0.9) out.push(`${sel}[${i}] scale ${sx.toFixed(2)}/${sy.toFixed(2)}`);
        });
      return out;
    },
    { animated: SETTLED, drawn: DRAWN },
  );

  if (stuck.length) note(`lõppseis@${width}: ${stuck.length} elementi jäi peitu — ${stuck.slice(0, 4).join(" | ")}`);
  await context.close();
}

/** Sektsioonipildid ülevaatuseks. */
if (WITH_SHOTS) {
  const sections = [
    ["hero", ".hero"],
    ["proof", ".proof"],
    ["chain", ".chain"],
    ["admin", ".admin"],
    ["caps", ".caps"],
    ["trust", ".trust"],
    ["offline", ".offline"],
    ["billing", ".bill"],
    ["pricing", ".price"],
    ["faq", ".faq"],
    ["final", ".final"],
    ["footer", ".foot"],
  ];

  for (const [width, tag] of [
    [1440, "desktop"],
    [390, "mobile"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await hideDevToolbar(page);
    await page.waitForTimeout(1500);

    for (const [name, selector] of sections) {
      const el = page.locator(selector).first();
      if ((await el.count()) === 0) continue;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page
        .waitForFunction(() => [...document.querySelectorAll("img")].every((i) => i.complete), null, {
          timeout: 5000,
        })
        .catch(() => {});
      await el.screenshot({ path: `${OUT}/${tag}-${name}.png` }).catch(() => {});
    }
    await context.close();
    console.log(`  pildid: ${tag}`);
  }
}

console.log(problems === 0 ? "✔ QA PUHAS" : `✗ ${problems} probleemi`);
await browser.close();
process.exit(problems === 0 ? 0 : 1);
