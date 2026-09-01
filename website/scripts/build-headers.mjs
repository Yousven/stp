/**
 * Genereerib Cloudflare Pages'i `_headers` faili buildi järel.
 *
 * Miks skript, mitte käsitsi kirjutatud fail: Astro paneb lühikesed
 * skriptid (navi peitmine, analytics) HTML-i sisse. Range CSP nõuab siis
 * nende SHA-256 räsi — ja räsi muutub iga kord, kui see kood muutub.
 * Käsitsi hoitud `_headers` läheks esimese muudatusega vaikselt katki ja
 * skriptid lakkaksid production'is töötamast.
 *
 * `unsafe-inline` on siin tahtlikult VÄLISTATUD. `unsafe-eval` samuti —
 * GSAP ei vaja seda.
 *
 * Kasutus: node scripts/build-headers.mjs   (jookseb `npm run build` sees)
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = "dist";

/** Inline-skriptide räsid → `script-src`. */
const scriptHashes = new Set();
/** Inline-stiilide räsid → `style-src`. Stiilileht on HTML-i sees (vt astro.config). */
const styleHashes = new Set();

const sha256 = (body) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith(".html")) yield full;
  }
}

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, "utf8");
  // Ainult `src`-ita skriptid — välistel on oma URL ja neid katab 'self'.
  for (const match of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1]) scriptHashes.add(sha256(match[1]));
  }
  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    if (match[1]) styleHashes.add(sha256(match[1]));
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...scriptHashes].sort().join(" ")}`,
  `style-src 'self' ${[...styleHashes].sort().join(" ")}`,
  "img-src 'self' data:",
  "font-src 'self'",
  // Turundusleht ei tee ühtegi võrgupäringut. Kui analytics-provider
  // lisandub, tuleb tema domeen SIIA lisada, muidu ta lihtsalt ei tööta.
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  /*
   * `upgrade-insecure-requests` on TEADLIKULT välja jäetud.
   *
   * Kaitset ta siin ei anna: kõik varad on suhtelised ja samast
   * päritolust, seega nad järgivad lehe enda skeemi, ja HSTS sunnib
   * domeeni niikuinii https-i. Küll aga murrab ta http kaudu testimise —
   * WebKit üritab siis ka `http://localhost` varasid https-iks upgrade'ida
   * ja kõik pildid kukuvad TLS-veaga läbi.
   */
].join("; ");

/*
 * Permissions-Policy.
 *
 * Toode kasutab asukohta, turundusleht MITTE. `geolocation=()` ütleb selle
 * brauserile välja: leht ei saa asukohta küsida ka siis, kui keegi hiljem
 * kogemata sellise koodi lisaks.
 */
const permissions = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

const content = `# GENEREERITUD — ära muuda käsitsi.
# Tekitab scripts/build-headers.mjs, mis jookseb \`npm run build\` sees.
# CSP räsid vastavad selle buildi inline-skriptidele.

/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: ${permissions}
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

# Failinimes on sisu räsi, seega neid võib igavesti hoida.
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Fondifailide nimed EI ole sisu järgi räsitud, seega aastane vahemälu
# tähendab: kui fonti kunagi VAHETATAKSE, tuleb failile anda UUS NIMI.
# Vt ASSETS.md. Ilma selleta hoiaks brauser vana faili aasta aega.
/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/og.png
  Cache-Control: public, max-age=604800

/favicon.svg
  Cache-Control: public, max-age=604800
`;

await writeFile(join(DIST, "_headers"), content, "utf8");
console.log(
  `✔ dist/_headers — CSP-s ${scriptHashes.size} skripti- ja ${styleHashes.size} stiiliräsi`,
);
