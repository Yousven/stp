/**
 * Teeb päris rakendusest ekraanitõmmised turunduslehe jaoks.
 *
 * Turunduslehel EI kasutata joonistatud ega väljamõeldud äpi UI-d — pildid
 * peavad tulema päris rakendusest demoandmetega (vt ASSETS.md). See skript
 * teeb selle korratavaks: uus tõmmis ei nõua käsitsi klõpsimist.
 *
 * EELDUSED
 *   1. MySQL jookseb (api/: docker-compose up -d)
 *   2. Eraldi DEMO-andmebaas — MITTE `time_tracking`:
 *        docker exec api-mysql-1 mysql -uroot -pdevrootpassword \
 *          -e "CREATE DATABASE IF NOT EXISTS stp_demo; \
 *              GRANT ALL ON stp_demo.* TO 'app'@'%'; FLUSH PRIVILEGES;"
 *        cd api
 *        DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npx prisma db push
 *        DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npm run prisma:seed
 *        DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npm run dev
 *   3. node scripts/demo-seed.mjs      (neutraalsed demoandmed)
 *   4. mobiili dev-server pordil 5173, mis osutab sellele API-le:
 *        echo 'VITE_API_BASE_URL="http://localhost:3000/api"' > mobile/.env.development.local
 *        npm --prefix mobile run dev
 *      (.env.development.local võidab .env.local üle ja see KUSTUTA pärast)
 *
 * Kasutus: node scripts/capture-app-ui.mjs
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { DEMO } from "./demo-seed.mjs";

const APP = process.env.APP_URL ?? "http://localhost:5173";
const OUT = "src/assets/app";
const PASSWORD = "DevPassword123!";

// Objekti koordinaadid, mille sees töötaja on. Server kontrollib kaugust,
// seega ilma selleta ei saaks aktiivset tööpäeva üldse näidata.
const GEO = { latitude: DEMO.site.lat + 0.0002, longitude: DEMO.site.lon + 0.0002, accuracy: 8 };

/** Objektist kaugel — kasutatakse "objektilt eemal" oleku jaoks. */
const GEO_AWAY = { latitude: DEMO.site.lat + 0.05, longitude: DEMO.site.lon + 0.06, accuracy: 14 };

/**
 * Ajavöönd, milles tõmmised renderdatakse.
 *
 * Lahtised tööpäevad on ankurdatud PÄRIS ajale, sest server arvutab
 * 12-tunnise piiri päris ajast (vt demo-seed.mjs). Kui capture jookseb
 * öösel, näitaks äpp "Alates 23:18" — tehniliselt õige, aga ehitusobjekti
 * turunduspildil ebausutav.
 *
 * Siin EI võltsita ühtegi andmet: instantsid, kestused ja olekud on
 * täpselt need, mille server välja andis. Valime ainult vööndi, milles
 * needsamad hetked loevad tavalise tööpäevana. Tööajal jooksutades on
 * nihe niikuinii ligi null.
 */
function workdayTimezone(startedHoursAgo) {
  const start = new Date(Date.now() - startedHoursAgo * 3600_000);
  const startUtcHours = start.getUTCHours() + start.getUTCMinutes() / 60;
  // Tahame, et tööpäeva algus loeks umbes kell 07:45.
  let offset = Math.round(7.75 - startUtcHours);
  while (offset > 12) offset -= 24;
  while (offset < -11) offset += 24;
  return offset >= 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

const TZ = process.env.CAPTURE_TZ ?? workdayTimezone(5.08);

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };

const shots = [
  // --- Telefon ---
  {
    name: "mobile-active",
    user: DEMO.workers[0].username,
    path: "/dashboard",
    viewport: MOBILE,
    geo: GEO,
    desc: "tööpäev käib, kohalolek kinnitatud",
  },
  {
    name: "mobile-away",
    user: DEMO.workers[1].username,
    path: "/dashboard",
    viewport: MOBILE,
    geo: GEO_AWAY,
    desc: "objektilt eemal, kell peatatud",
  },
  {
    name: "mobile-start",
    user: DEMO.workers[2].username,
    path: "/start-work",
    viewport: MOBILE,
    geo: GEO,
    desc: "tööpäeva alustamine, objekti valik",
  },
  {
    name: "mobile-history",
    user: DEMO.workers[0].username,
    path: "/history",
    viewport: MOBILE,
    geo: GEO,
    desc: "tööajalugu nädalate kaupa",
  },

  // --- Arvuti (admin) ---
  {
    name: "desktop-overview",
    user: "admin",
    path: "/dashboard",
    viewport: DESKTOP,
    geo: GEO,
    desc: "kes on praegu tööl — üks objektil, üks eemal",
  },
  {
    name: "desktop-billing",
    user: "admin",
    path: "/admin/billing",
    viewport: DESKTOP,
    geo: GEO,
    scrollTo: 560,
    desc: "arveldus: tellija → objekt → tööliik → hind",
  },
  {
    name: "desktop-invoice",
    user: "admin",
    path: "/admin/invoices",
    viewport: DESKTOP,
    geo: GEO,
    desc: "arved",
  },
  {
    name: "desktop-worktypes",
    user: "admin",
    path: "/admin/work-types",
    viewport: DESKTOP,
    geo: GEO,
    desc: "tööliigid ja vaikehinnad",
  },
  {
    name: "desktop-reports",
    user: "admin",
    path: "/admin/reports",
    viewport: DESKTOP,
    geo: GEO,
    desc: "raportid",
  },
];

const browser = await chromium.launch({ channel: "chrome" });
await mkdir(OUT, { recursive: true });
console.log(`  ajavöönd: ${TZ}`);

/**
 * Sessioon kasutaja kohta, mitte tõmmise kohta.
 *
 * Server lubab 20 sisselogimiskatset 15 minuti kohta. Iga tõmmise jaoks
 * eraldi sisselogimine sööks selle limiidi ära ja skript jookseks poole
 * peal 429-ga kokku — nii ei oleks ta enam korratav.
 */
const sessions = new Map();

async function sessionFor(user) {
  if (sessions.has(user)) return sessions.get(user);

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  const inputs = page.locator("form input");
  await inputs.nth(0).fill("demo");
  await inputs.nth(1).fill(user);
  await inputs.nth(2).fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/dashboard", { timeout: 20000 });

  const state = await context.storageState();
  await context.close();
  sessions.set(user, state);
  return state;
}

for (const shot of shots) {
  const storageState = await sessionFor(shot.user);
  const context = await browser.newContext({
    viewport: { width: shot.viewport.width, height: shot.viewport.height },
    deviceScaleFactor: shot.viewport.deviceScaleFactor,
    colorScheme: "dark",
    locale: "et-EE",
    timezoneId: TZ,
    geolocation: shot.geo,
    permissions: ["geolocation"],
    storageState,
  });
  const page = await context.newPage();

  await page.goto(`${APP}${shot.path}`, { waitUntil: "networkidle" });

  if (shot.scrollTo) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollTo);
    await page.waitForTimeout(600);
  }

  // Kell, kohalolek ja päringud jõuavad kohale alles pärast esimest laadimist.
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
  await context.close();
  console.log(`✔ ${shot.name}.png — ${shot.desc}`);
}

await browser.close();
