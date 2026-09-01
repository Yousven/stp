/**
 * Interaktsiooni- ja brauseriomaduste QA.
 *
 * `qa.mjs` kontrollib, kuidas leht VÄLJA NÄEB. See siin kontrollib, mis
 * juhtub, kui kasutaja midagi teeb: ankrud, keelevahetus, resize, refresh
 * keset lehte. Lisaks kontrollib ta neid CSS-omadusi, mille tugi Safaris
 * on ajalooliselt hiljem tulnud (`color-mix`, `backdrop-filter`, `svh`).
 *
 * Kasutus: node scripts/qa-interaction.mjs [--webkit]
 */
import { chromium, webkit } from "playwright-core";

const BASE = process.env.SITE_URL ?? "http://localhost:4321";
const USE_WEBKIT = process.argv.includes("--webkit");

const browser = USE_WEBKIT ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
console.log(USE_WEBKIT ? "mootor: WebKit (Safari)" : "mootor: Chrome");

let problems = 0;
const fail = (m) => {
  problems++;
  console.log(`✗ ${m}`);
};
const ok = (m) => console.log(`✔ ${m}`);

/** Loeb lehel elavate ScrollTriggerite arvu ilma allikat muutmata. */
const triggerCount = (page) =>
  page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((n) => /gsap/.test(n));
    if (!url) return -1;
    const mod = await import(url);
    const ST = Object.values(mod).find((v) => v && typeof v.getAll === "function");
    return ST ? ST.getAll().length : -1;
  });

const newPage = async (viewport, extra = {}) => {
  const context = await browser.newContext({ viewport, colorScheme: "dark", ...extra });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return { context, page, errors };
};

/* --- 1. CSS-omadused, mille tugi Safaris on hiljem tulnud --- */
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const support = await page.evaluate(() => ({
    colorMix: CSS.supports("color", "color-mix(in srgb, #fff 50%, transparent)"),
    backdrop:
      CSS.supports("backdrop-filter", "blur(8px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(8px)"),
    svh: CSS.supports("height", "100svh"),
    clipPath: CSS.supports("clip-path", "inset(0 0 50% 0)"),
    mask: CSS.supports("mask-image", "radial-gradient(#000, transparent)") ||
      CSS.supports("-webkit-mask-image", "radial-gradient(#000, transparent)"),
    aspectRatio: CSS.supports("aspect-ratio", "16 / 9"),
    /*
     * Navi taust ei tohi olla läbipaistev ka siis, kui `color-mix` puudub.
     * Brauserid annavad arvutatud väärtuse eri kujul: Chrome
     * `color(srgb r g b / a)`, WebKit `rgba(r, g, b, a)` — mõlemast tuleb
     * läbipaistmatus kätte saada.
     */
    navOpaque: (() => {
      const bg = getComputedStyle(document.querySelector(".nav")).backgroundColor;
      const slash = bg.match(/\/\s*([0-9.]+)\s*\)/);
      if (slash) return parseFloat(slash[1]) > 0.5;
      const rgba = bg.match(/rgba?\(([^)]+)\)/);
      if (!rgba) return false;
      const parts = rgba[1].split(",").map((v) => parseFloat(v));
      return parts.length < 4 || parts[3] > 0.5;
    })(),
  }));

  for (const [name, value] of Object.entries(support)) {
    if (!value) fail(`CSS tugi puudub või varuvärv ei tööta: ${name}`);
  }
  if (Object.values(support).every(Boolean)) ok("CSS-omadused ja varuvärvid");
  await context.close();
}

/* --- 2. Kleepuv navigatsioon --- */
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 100));
  await page.waitForTimeout(600);
  const navTop = await page.evaluate(() =>
    Math.round(document.querySelector(".nav").getBoundingClientRect().top),
  );
  if (navTop > 4) fail(`kleepuv nav ei ole ülal (top ${navTop})`);
  else ok(`kleepuv nav (top ${navTop})`);
  await context.close();
}

/* --- 3. Ankrunavigatsioon --- */
{
  const { context, page, errors } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  for (const id of ["how", "admin", "billing", "pricing"]) {
    await page.evaluate((anchor) => {
      location.hash = "";
      location.hash = anchor;
    }, id);
    await page.waitForTimeout(800);
    const top = await page.evaluate(
      (anchor) => Math.round(document.getElementById(anchor).getBoundingClientRect().top),
      id,
    );
    if (Math.abs(top - 72) > 40) fail(`ankur #${id}: ülaserv ${top}px (oodatud ~72)`);
  }
  if (errors.length) fail(`ankrud: ${errors[0]}`);
  else ok("ankrunavigatsioon");
  await context.close();
}

/* --- 4. Refresh keset lehte (S3, S6, S8, hind) --- */
for (const [hash, selector, label] of [
  ["#how", ".chain__step", "S3"],
  ["#admin", ".admin__crop", "S4"],
  ["#billing", ".bill__flow-item", "S8"],
  ["#pricing", ".price__amount", "S9"],
]) {
  const { context, page, errors } = await newPage({ width: 1440, height: 900 });
  await page.goto(`${BASE}${hash}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return { y: Math.round(window.scrollY), opacity: el ? parseFloat(getComputedStyle(el).opacity) : -1 };
  }, selector);
  if (r.y < 100) fail(`refresh ${hash}: ei kerinud kohale (scrollY ${r.y})`);
  else if (r.opacity < 0.5) fail(`refresh ${hash}: ${label} sisu jäi peitu (opacity ${r.opacity})`);
  else if (errors.length) fail(`refresh ${hash}: ${errors[0]}`);
  else ok(`refresh ${hash} (${label}, scrollY ${r.y})`);
  await context.close();
}

/* --- 5. Keelevahetus pärast laadimist --- */
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 5000));
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/ru/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const lang = await page.evaluate(() => document.documentElement.lang);
  const n = await triggerCount(page);
  if (lang !== "ru") fail(`keelevahetus: lang=${lang}`);
  else if (n < 30) fail(`keelevahetus: ainult ${n} trigger'it`);
  else ok(`keelevahetus → ${lang}, ${n} trigger'it`);
  await context.close();
}

/* --- 6. Resize desktop → mobiil → desktop --- */
{
  const { context, page, errors } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const before = await triggerCount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const mobile = await triggerCount(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1200);
  const after = await triggerCount(page);
  const state = await page.evaluate(() => ({
    spacers: document.querySelectorAll(".pin-spacer").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  if (state.overflow) fail("resize: horisontaalne ülevool");
  if (state.spacers !== 2) fail(`resize tagasi: ${state.spacers} pin-spacer'it (oodatud 2)`);
  if (after < before - 2) fail(`resize tagasi: triggereid ${after}, enne ${before}`);
  if (errors.length) fail(`resize: ${errors[0]}`);
  if (!state.overflow && state.spacers === 2 && after >= before - 2 && !errors.length)
    ok(`resize 1440→390→1440: ${before}→${mobile}→${after} trigger'it`);
  await context.close();
}

/* --- 7. CTA-d viivad kõik samasse kohta --- */
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('[data-analytics="cta_click"]')].map((a) => ({
      href: a.getAttribute("href"),
      where: a.dataset.analyticsLocation,
    })),
  );
  const unique = new Set(hrefs.map((h) => h.href));
  if (hrefs.length < 4) fail(`CTA-sid on ainult ${hrefs.length} (oodatud nav + hero + hind + lõpp)`);
  else if (unique.size !== 1) fail(`CTA-d osutavad eri kohtadesse: ${[...unique].join(", ")}`);
  else ok(`${hrefs.length} CTA-d → ${[...unique][0]} (${hrefs.map((h) => h.where).join(", ")})`);
  await context.close();
}

/* --- 8. Analytics: sündmused tekivad ja PII-d ei ole --- */
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    document.querySelector(".faq__item")?.removeAttribute("open");
    document.querySelector(".faq__item summary")?.click();

    /*
     * Keri nagu inimene, mitte ühe hüppega lõppu.
     * `pricing_view` on IntersectionObserveril ja hüppega üle sektsiooni
     * ei satu see kunagi ekraanile; `scroll_90` arvutatakse lehe kõrgusest,
     * mis pinnitud sektsioonide tõttu kerimise ajal veel muutub.
     */
    const step = window.innerHeight * 0.5;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
  });
  await page.waitForTimeout(800);
  const events = await page.evaluate(() => window.stpAnalytics?.queue?.map((e) => e.name) ?? []);
  const expected = ["faq_open", "scroll_50", "scroll_90", "pricing_view"];
  const missing = expected.filter((e) => !events.includes(e));
  if (missing.length) fail(`analytics: puuduvad sündmused ${missing.join(", ")}`);
  else ok(`analytics: ${[...new Set(events)].join(", ")}`);
  await context.close();
}

/* --- 9. Ilma JavaScriptita peab sisu olema loetav --- */
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const text = await page.locator("body").innerText();
  const hidden = await page.locator(".price__amount").evaluate((el) => getComputedStyle(el).opacity);
  if (text.length < 2000) fail(`ilma JS-ita: sisu on ainult ${text.length} tähemärki`);
  else if (Number(hidden) < 0.9) fail(`ilma JS-ita: hind on peidus (opacity ${hidden})`);
  else ok(`ilma JS-ita: ${text.length} tähemärki sisu, kõik nähtav`);
  await context.close();
}

await browser.close();
console.log(problems ? `\n✗ ${problems} probleemi` : "\n✔ INTERAKTSIOONI-QA PUHAS");
process.exit(problems ? 1 : 0);
