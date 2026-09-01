/**
 * Ligipääsetavuse audit.
 *
 * Kontrollib seda, mida saab masinaga kontrollida: pealkirjahierarhia,
 * maamärgid, fookus, kontrast, `alt`-tekstid, klaviatuur ja lugemisjärjekord.
 * Ei asenda päris ekraanilugejaga läbikäimist, aga tabab ära kõik selle,
 * mis tavaliselt märkamatult katki läheb.
 *
 * Kasutus: node scripts/qa-a11y.mjs [--webkit]
 */
import { chromium, webkit } from "playwright-core";

const BASE = process.env.SITE_URL ?? "http://localhost:4321";
const USE_WEBKIT = process.argv.includes("--webkit");
const PAGES = ["/", "/en/", "/ru/", "/uk/", "/privacy/", "/contact/", "/404-puudub/"];

const browser = USE_WEBKIT ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
let problems = 0;
const fail = (m) => {
  problems++;
  console.log(`✗ ${m}`);
};

/** WCAG-i suhtelise heleduse valem. */
const CONTRAST_FN = `(fg, bg) => {
  const lum = (color) => {
    const nums = color.match(/[0-9.]+/g).map(Number);
    const [r, g, b] = nums.slice(0, 3).map((v) => {
      const c = (v > 1 ? v / 255 : v);
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(fg), b2 = lum(bg);
  return (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
}`;

for (const path of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const r = await page.evaluate((contrastSrc) => {
    const contrast = eval(`(${contrastSrc})`);
    const out = { headings: [], skips: [], landmarks: {}, altMissing: [], ariaAbuse: [], contrast: [] };

    // Pealkirjad
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    let previous = 0;
    for (const h of hs) {
      const level = Number(h.tagName[1]);
      out.headings.push(level);
      if (previous && level > previous + 1) out.skips.push(`h${previous}→h${level}: ${h.textContent.trim().slice(0, 40)}`);
      previous = level;
    }
    out.h1 = hs.filter((h) => h.tagName === "H1").length;

    // Maamärgid
    out.landmarks = {
      header: document.querySelectorAll("header").length,
      nav: document.querySelectorAll("nav").length,
      main: document.querySelectorAll("main").length,
      footer: document.querySelectorAll("footer").length,
      navLabelled: [...document.querySelectorAll("nav")].every(
        (n) => n.hasAttribute("aria-label") || n.hasAttribute("aria-labelledby"),
      ),
    };

    // Pildid: kas `alt` on olemas või on pilt selgelt dekoratiivne
    for (const img of document.querySelectorAll("img")) {
      const alt = img.getAttribute("alt");
      const decorative = alt === "" && img.getAttribute("aria-hidden") === "true";
      if (alt === null) out.altMissing.push(img.currentSrc.split("/").pop());
      else if (alt === "" && !decorative)
        out.altMissing.push(`tühi alt ilma aria-hidden: ${img.currentSrc.split("/").pop()}`);
    }

    // Klikitav element, mis ei ole link ega nupp
    for (const el of document.querySelectorAll("[onclick], [role='button']")) {
      if (!["A", "BUTTON", "SUMMARY"].includes(el.tagName)) out.ariaAbuse.push(el.tagName);
    }

    // Kontrast: tekstielemendid oma tegeliku taustaga
    const bgOf = (el) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/rgba?\([^)]*,\s*0\s*\)/.test(bg) && bg !== "transparent") return bg;
        node = node.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const sample = [
      "p", ".hud", ".caps__body", ".trust__point-body", ".offline__state-note",
      ".bill__rule-body", ".price__include", ".foot__rights", ".foot__byline",
      ".nav__section", ".nav__lang", ".legal__body",
    ];
    for (const sel of sample) {
      const el = document.querySelector(sel);
      if (!el || !el.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      // WCAG AA: suur tekst 3:1, tavaline 4.5:1
      const large = size >= 24 || (size >= 18.66 && bold);
      const ratio = contrast(cs.color, bgOf(el));
      out.contrast.push({ sel, ratio: +ratio.toFixed(2), need: large ? 3 : 4.5 });
    }

    out.lang = document.documentElement.lang;
    out.title = document.title;
    return out;
  }, CONTRAST_FN);

  const tag = path;
  if (r.h1 !== 1) fail(`${tag}: h1 arv ${r.h1}`);
  if (r.skips.length) fail(`${tag}: pealkirjahüpe — ${r.skips.join(" | ")}`);
  if (!r.landmarks.main) fail(`${tag}: <main> puudub`);
  if (!r.landmarks.footer) fail(`${tag}: <footer> puudub`);
  if (!r.landmarks.navLabelled) fail(`${tag}: mõnel <nav>-il puudub aria-label`);
  if (r.altMissing.length) fail(`${tag}: alt-probleemid — ${r.altMissing.slice(0, 3).join(", ")}`);
  if (r.ariaAbuse.length) fail(`${tag}: klikitav mitte-link/nupp — ${r.ariaAbuse.join(", ")}`);
  if (!r.lang) fail(`${tag}: <html lang> puudub`);
  for (const c of r.contrast) {
    if (c.ratio < c.need) fail(`${tag}: kontrast ${c.sel} ${c.ratio}:1 (vaja ${c.need}:1)`);
  }

  const worst = r.contrast.length ? Math.min(...r.contrast.map((c) => c.ratio)) : null;
  console.log(
    `  ${tag.padEnd(16)} h1=${r.h1} pealkirju=${r.headings.length} ` +
      `nav=${r.landmarks.nav} main=${r.landmarks.main} ` +
      `halvim kontrast=${worst ?? "–"}:1`,
  );
  await context.close();
}

/* --- Fookus ja klaviatuur --- */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  let stops = 0;
  let missingOutline = 0;
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        key: `${el.tagName}.${el.className}`.slice(0, 60),
        outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
      };
    });
    if (!info) break;
    if (seen.has(info.key)) continue;
    seen.add(info.key);
    stops++;
    if (!info.outline) missingOutline++;
  }
  if (missingOutline) fail(`fookus: ${missingOutline} elementi ilma nähtava fookusääriseta`);
  console.log(`  klaviatuur: ${stops} fookuspeatust, ${stops - missingOutline} nähtava fookusega`);

  // FAQ peab avanema klaviatuurilt
  await page.locator(".faq__item summary").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const open = await page.locator(".faq__item").nth(1).evaluate((el) => el.open);
  if (!open) fail("FAQ ei avane klaviatuurilt (Enter)");
  else console.log("  FAQ avaneb klaviatuurilt");
  await context.close();
}

await browser.close();
console.log(problems ? `\n✗ ${problems} probleemi` : "\n✔ LIGIPÄÄSETAVUS PUHAS");
process.exit(problems ? 1 : 0);
