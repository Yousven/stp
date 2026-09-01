/**
 * Serveerib `dist/` nii, nagu Cloudflare Pages seda teeks — koos
 * `_headers` failist loetud päistega.
 *
 * Miks: `astro preview` EI rakenda `_headers`-it, seega CSP-d ja
 * turvapäiseid ei saa sellega kontrollida. Ilma selleta selguks katkine
 * CSP alles production'is, kus ta vaikselt tapaks kogu JavaScripti.
 *
 * Kasutus: node scripts/serve-dist.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const PORT = Number(process.argv[2] ?? 4330);

/** Cloudflare pakib teksti — ilma selleta oleksid siinsed mõõtmised valed. */
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".xml", ".txt", ".json"]);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

/**
 * `_headers` süntaks: tee-muster reata taandeta, päised taandega.
 * Toetame `/*` ja `/prefix/*` mustreid — rohkem meil ei ole.
 */
async function loadHeaderRules() {
  let raw;
  try {
    raw = await readFile(join(DIST, "_headers"), "utf8");
  } catch {
    console.warn("dist/_headers puudub — jooksuta enne `npm run build`");
    return [];
  }
  const rules = [];
  let current = null;
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const idx = line.indexOf(":");
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

const rules = await loadHeaderRules();

/*
 * HSTS jäetakse siin saatmata.
 *
 * See server on http, HSTS on https-i päis. WebKit jätab ta meelde ka
 * `localhost`-i kohta ja hakkab seejärel kõiki varasid https-iks
 * upgrade'ima — kogu leht kukub TLS-veaga läbi ja testitulemus on müra.
 * Production'is saadab päise Cloudflare `_headers` failist, kus ta ka
 * alles on.
 */
const SKIP_OVER_HTTP = new Set(["strict-transport-security"]);

function headersFor(pathname) {
  const out = [];
  for (const rule of rules) {
    const prefix = rule.pattern.endsWith("*") ? rule.pattern.slice(0, -1) : null;
    const match = prefix ? pathname.startsWith(prefix) : pathname === rule.pattern;
    if (!match) continue;
    for (const [name, value] of rule.headers) {
      if (!SKIP_OVER_HTTP.has(name.toLowerCase())) out.push([name, value]);
    }
  }
  return out;
}

async function resolve(pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidates = safe.endsWith("/")
    ? [join(DIST, safe, "index.html")]
    : [join(DIST, safe), join(DIST, `${safe}.html`), join(DIST, safe, "index.html")];

  for (const file of candidates) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      /* proovi järgmist */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = await resolve(pathname);

  if (!file) {
    // Sama mis Pages: tundmatu tee → 404.html, staatuskoodiga 404.
    const notFound = join(DIST, "404.html");
    const body = await readFile(notFound).catch(() => Buffer.from("404"));
    res.writeHead(404, { "Content-Type": TYPES[".html"], ...Object.fromEntries(headersFor("/")) });
    res.end(body);
    return;
  }

  const ext = extname(file);
  let body = await readFile(file);
  const extra = {};

  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
    body = gzipSync(body);
    extra["Content-Encoding"] = "gzip";
    extra["Vary"] = "Accept-Encoding";
  }

  res.writeHead(200, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Content-Length": body.length,
    ...extra,
    ...Object.fromEntries(headersFor(pathname)),
  });
  res.end(body);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`dist serveeritud päistega: http://localhost:${PORT}`);
});
