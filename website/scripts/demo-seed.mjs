/**
 * Demoandmed turunduslehe ekraanitõmmiste jaoks.
 *
 * Kasutab AINULT olemasolevaid API-otspunkte — turunduslehe pärast ei ole
 * `api/`-sse ega `mobile/`-isse midagi lisatud. Skript on korratav: sama
 * käsk annab sama seisu.
 *
 * Kõik nimed on NEUTRAALSED väljamõeldud demoandmed. Päris kliendi ega
 * päris objekti andmeid siia ei panda.
 *
 * Eeldab:
 *   - API jookseb ERALDI demo-andmebaasi vastu (mitte `time_tracking`)
 *   - `npm run prisma:seed` on tehtud (loob admin/employee ja ettevõtte)
 *
 * Kasutus: node scripts/demo-seed.mjs
 */

const API = process.env.API_URL ?? "http://localhost:3000/api";
const ORG = "demo";
const PASSWORD = "DevPassword123!";

/** Peaobjekt, mille ümber kogu jutustus käib. */
export const DEMO = {
  site: { name: "Riia 24", lat: 58.3742, lon: 26.718, radiusM: 120 },
  sites: [
    { name: "Riia 24", address: "Riia 24", lat: 58.3742, lon: 26.718, radius: 120, rate: 42 },
    { name: "Kesklinna objekt", address: "Kesklinn", lat: 58.38, lon: 26.722, radius: 150, rate: 38 },
    { name: "Laohoone", address: "Tööstuse tee", lat: 58.365, lon: 26.74, radius: 200, rate: 35 },
  ],
  workers: [
    { username: "Mart Tamm", email: "mart@demo.test", rate: 14 },
    { username: "Kristjan Lepik", email: "kristjan@demo.test", rate: 15 },
    { username: "Priit Saar", email: "priit@demo.test", rate: 13.5 },
  ],
  workTypes: [
    { name: "Müüritööd", code: "MUUR", defaultRate: 32 },
    { name: "Betoonitööd", code: "BET", defaultRate: 36 },
    // Vaikehinnata tööliik on tahtlik: arveldusraport peab näitama, et
    // hinnata tunnid jäävad arvelt VÄLJA, mitte ei lähe nulliga sisse.
    { name: "Koristus", code: "KOR", defaultRate: null },
  ],
  client: { name: "Tellija AS", registryCode: "10000000", paymentTermDays: 14, vatRate: 22 },
};

/**
 * LAHTISED tööpäevad ankurdatakse PÄRIS kellaaega, mitte fikseeritud
 * päevasele tunnile.
 *
 * Põhjus on serveripoolne: lahtise tööpäeva tundide kasv peatub 12 tunni
 * pärast (`MAX_OPEN_LOG_HOURS`) ja server arvutab selle päris ajast. Kui
 * seemne aeg pandaks "eile kell 08:00", märgiks server päeva unustatuks ja
 * ekraanile ilmuks punane hoiatus — pilt ja server räägiksid vastu.
 *
 * Kõrvalmõju: kellaajad tõmmistel sõltuvad sellest, mis kell capture't
 * jooksutati. Kõige loomulikumad ajad saab, kui teha tõmmised tööajal.
 */
const openStart = (hoursBack) => new Date(Date.now() - hoursBack * 3600_000).toISOString();

const daysAgo = (d, hour) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

async function call(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Tokenid vahemällu: ilma selleta logiks skript iga töölogi kohta uuesti
// sisse ja jookseks serveri sisselogimispiirangusse (20 katset 15 min).
const tokenCache = new Map();
async function login(username) {
  const cached = tokenCache.get(username);
  if (cached) return cached;
  const { accessToken } = await call("/auth/login", {
    method: "POST",
    body: { orgSlug: ORG, username, password: PASSWORD },
  });
  tokenCache.set(username, accessToken);
  return accessToken;
}

export async function seedDemo() {
  const admin = await login("admin");

  // --- Ettevõtte rekvisiidid ---
  // Ilma nendeta keeldub server arve koostamisest. Kõik väljamõeldud.
  await call("/settings/company", {
    method: "PUT",
    body: {
      name: "Demo Ehitus OÜ",
      registryCode: "10000001",
      vatNumber: "EE100000001",
      address: "Näidise tee 1, Tartu",
      email: "arved@demo.test",
      phone: "+372 5000 0000",
      iban: "EE000000000000000000",
      defaultVatRate: 22,
    },
    token: admin,
  }).catch(() => {});

  // --- Tellija ---
  const clients = await call("/clients", { token: admin });
  let client = clients.find?.((c) => c.name === DEMO.client.name) ?? null;
  if (!client) client = await call("/clients", { method: "POST", body: DEMO.client, token: admin });

  // --- Tööliigid ---
  const existingTypes = await call("/work-types", { token: admin });
  const workTypes = [];
  for (const wt of DEMO.workTypes) {
    const found = existingTypes.find?.((t) => t.name === wt.name);
    workTypes.push(found ?? (await call("/work-types", { method: "POST", body: wt, token: admin })));
  }

  // --- Objektid ---
  const existingObjects = await call("/objects", { token: admin });
  const objects = [];
  for (const s of DEMO.sites) {
    const found = existingObjects.find?.((o) => o.name === s.name);
    if (found) {
      objects.push(found);
      continue;
    }
    objects.push(
      await call("/objects", {
        method: "POST",
        body: {
          name: s.name,
          address: s.address,
          latitude: s.lat,
          longitude: s.lon,
          radius: s.radius,
          clientId: client.id,
          billableRate: s.rate,
        },
        token: admin,
      })
    );
  }

  // Baas-seemne "Demo objekt" on 100 km raadiusega ja rikuks nii pildi kui
  // jutustuse (geofence peab olema objekti suurune). Võtame ta nimekirjast.
  for (const o of existingObjects) {
    if (!DEMO.sites.some((site) => site.name === o.name) && !o.deleted) {
      await call(`/objects/${o.id}/deactivate`, { method: "POST", token: admin }).catch(() => {});
    }
  }

  // Tööliigid tuleb objektile määrata ENNE kui tööpäeva saab nendega
  // alustada — server keeldub tööliigist, mida sellel objektil ei ole.
  //
  // Peaobjektil on müüritöödel objektipõhine hind (34 €), mis on tugevam
  // kui tööliigi vaikehind (32 €). Koristusel ei ole hinda kummalgi
  // tasemel — need tunnid jäävad arvelt VÄLJA ja loetakse eraldi. Just
  // seda peab S8 näitama.
  const rates = [
    [{ i: 0, rate: 34 }, { i: 1, rate: null }, { i: 2, rate: null }],
    [{ i: 0, rate: null }, { i: 1, rate: null }, { i: 2, rate: null }],
    [{ i: 0, rate: null }, { i: 1, rate: null }, { i: 2, rate: null }],
  ];

  for (let o = 0; o < objects.length; o++) {
    await call(`/objects/${objects[o].id}/work-types`, {
      method: "PUT",
      body: { workTypes: rates[o].map((r) => ({ workTypeId: workTypes[r.i].id, rate: r.rate })) },
      token: admin,
    });
  }

  // --- Töötajad ---
  const existingUsers = await call("/users", { token: admin });
  const workers = [];
  for (const w of DEMO.workers) {
    const found = existingUsers.find?.((u) => u.username === w.username);
    workers.push(
      found ??
        (await call("/users", {
          method: "POST",
          body: {
            username: w.username,
            email: w.email,
            password: PASSWORD,
            hourlyRate: w.rate,
            advance: 0,
            role: "employee",
          },
          token: admin,
        }))
    );
  }

  // Töölogide osa on korduskäivitusel vahelejäetav: server keeldub teisest
  // lahtisest tööpäevast samal objektil ja skript peab olema korratav.
  const already = await call("/me/org-status", { token: admin });
  const alreadySeeded = (already?.active?.length ?? 0) >= 2;

  // --- Lõpetatud tööpäevad viimasest nädalast ---
  // Server keeldub üle 7 päeva vanadest kirjetest, seega ajalugu tehakse
  // selle akna sees. Tunnid on usutavad: ei ühtegi 22-tunnist päeva.
  const finished = [
    { worker: 0, obj: 0, wt: 0, day: 5, start: 8, end: 16.5 },
    { worker: 0, obj: 0, wt: 0, day: 4, start: 8, end: 17 },
    { worker: 0, obj: 1, wt: 1, day: 3, start: 7.5, end: 16 },
    { worker: 1, obj: 0, wt: 1, day: 5, start: 8, end: 16 },
    { worker: 1, obj: 0, wt: 2, day: 4, start: 9, end: 15.5 },
    { worker: 1, obj: 2, wt: 0, day: 2, start: 8, end: 17 },
    { worker: 2, obj: 1, wt: 0, day: 3, start: 8, end: 16 },
    { worker: 2, obj: 0, wt: 1, day: 1, start: 8, end: 16.5 },
  ];

  for (const f of alreadySeeded ? [] : finished) {
    const token = await login(DEMO.workers[f.worker].username);
    const site = DEMO.sites[f.obj];
    const log = await call("/time-logs/start", {
      method: "POST",
      body: {
        objectId: objects[f.obj].id,
        latitude: site.lat + 0.0002,
        longitude: site.lon + 0.0002,
        accuracy: 8,
        workTypeId: workTypes[f.wt].id,
        occurredAt: daysAgo(f.day, f.start),
      },
      token,
    });
    await call(`/time-logs/${log.id}/end`, {
      method: "POST",
      body: { lunch: 0.5, occurredAt: daysAgo(f.day, f.end) },
      token,
    });
  }

  // --- Üks arve, kitsalt ühe päeva pealt ---
  // Arveldatud tunnid kaovad arveldusraportist (need on juba arvel), seega
  // arve tehakse ainult kõige vanema päeva pealt. Nii on korraga näha nii
  // valmis arve kui ka veel arveldamata tunnid — täpselt see, mida S8
  // näitama peab.
  const day = (d) => {
    const t = new Date();
    t.setDate(t.getDate() - d);
    return t.toISOString().slice(0, 10);
  };
  const existingInvoices = await call("/invoices", { token: admin });
  let invoice;
  if (!existingInvoices?.length) {
    invoice = await call("/invoices", {
      method: "POST",
      body: { clientId: client.id, dateFrom: day(5), dateTo: day(5) },
      token: admin,
    }).catch(() => null);
  } else {
    invoice = existingInvoices[0];
  }

  // --- Kaks lahtist tööpäeva: üks objektil, teine eemal ---
  if (alreadySeeded) {
    return {
      objects,
      workTypes,
      workers,
      client,
      invoice,
      onSiteUser: DEMO.workers[0].username,
      awayUser: DEMO.workers[1].username,
      skipped: true,
    };
  }

  const onSiteToken = await login(DEMO.workers[0].username);
  const onSiteLog = await call("/time-logs/start", {
    method: "POST",
    body: {
      objectId: objects[0].id,
      latitude: DEMO.site.lat + 0.0002,
      longitude: DEMO.site.lon + 0.0002,
      accuracy: 8,
      workTypeId: workTypes[0].id,
      occurredAt: openStart(5.08),
    },
    token: onSiteToken,
  });

  const awayToken = await login(DEMO.workers[1].username);
  const awayLog = await call("/time-logs/start", {
    method: "POST",
    body: {
      objectId: objects[0].id,
      latitude: DEMO.site.lat + 0.0002,
      longitude: DEMO.site.lon + 0.0002,
      accuracy: 8,
      workTypeId: workTypes[1].id,
      occurredAt: openStart(6.0),
    },
    token: awayToken,
  });

  // Lahkumine objektilt PEATAB kella, aga EI lõpeta tööpäeva — täpselt
  // see, mida S3 samm 04 ja S4 näitama peavad.
  await call(`/time-logs/${awayLog.id}/presence-events`, {
    method: "POST",
    body: {
      events: [
        {
          type: "EXIT",
          occurredAt: openStart(1.33),
          latitude: DEMO.site.lat + 0.04,
          longitude: DEMO.site.lon + 0.05,
          accuracy: 12,
          source: "native",
        },
      ],
    },
    token: awayToken,
  });

  return {
    invoice,
    objects,
    workTypes,
    workers,
    client,
    onSiteLog,
    awayLog,
    onSiteUser: DEMO.workers[0].username,
    awayUser: DEMO.workers[1].username,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await seedDemo();
  console.log(
    `✔ demoandmed${r.skipped ? " (olemas, ei muudetud)" : ""}: ${r.objects.length} objekti, ` +
      `${r.workers.length} töötajat, ${r.workTypes.length} tööliiki · ` +
      `objektil: ${r.onSiteUser} · eemal: ${r.awayUser}` +
      (r.invoice ? ` · arve ${r.invoice.number}` : "")
  );
}
