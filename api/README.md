# SmartTimePlanning API

Node.js + TypeScript + Express + Prisma REST API, mis asendab järk-järgult
`public/*.php` äriloogika. Loodud plaani järgi: `/Users/margo.hain/.claude/plans/bubbly-exploring-hartmanis.md`
(Faas 0 + Faas 1: infra skafold, autentimine, tööajaarvestuse tuum).

Praegu jookseb esimene versioon Ubuntu 24.04 serveris (Proxmox VM),
Docker Compose'iga — vt "Deploy" allpool.

## Kohalik arendus

```bash
cp .env.example .env        # muuda vajadusel väärtusi
docker compose up -d        # käivitab kohaliku MySQL + Adminer (localhost:8080)
npm install
npm run prisma:generate
npx prisma db push          # loob tabelid kohalikku dev-MySQL-i skeemi järgi
npm run prisma:seed         # demo admin/employee kasutajad + 1 objekt
npm run dev                 # http://localhost:3000/api/health
```

Demo kasutajad pärast seedimist: `admin` / `employee`, parool mõlemal
`DevPassword123!` — **ainult kohalikuks arenduseks**, mitte kunagi toodangus.

## Ühendamine päris (Proxmoxi) andmebaasiga

1. Sea `.env` failis `DATABASE_URL` osutama olemasolevale MySQL instantsile
   (samad mandaadid, mis `../config/config.php`-s — ära pane neid siia repos
   githubi, ainult `.env` faili, mis on `.gitignore`-is).
2. Käivita `npm run prisma:pull` — see loeb päris tabelistruktuuri ja
   uuendab `prisma/schema.prisma`, kui see erineb siin käsitsi kirjutatud
   versioonist. Vaata `git diff` üle enne kasutamist.
3. **Ära kunagi** käivita `prisma db push` ega migratsioone päris
   andmebaasi vastu ilma varunduseta — see rakendus ei loo/kustuta tabeleid
   toodangus, ainult loeb/kirjutab olemasolevaid ridu.

## Kasutajate liitumine (App Store / Play Store voog)

Kolm teed konto saamiseks, kõik kaetud:

1. **Uus ettevõte** — `POST /auth/register-organization`. Loob organisatsiooni
   + esimese admini. Kasutaja saab kohe tokenid.
2. **Liitumistaotlus** — `POST /auth/request-access`. Töötaja sisestab
   ettevõtte koodi ja loob konto, mis jääb `status: "pending"` olekusse.
   **Tokeneid ei tagastata** ja login annab 403 kuni admin kinnitab
   (`POST /users/:id/approve`, kus tunnihind on kohustuslik) või lükkab
   tagasi (`POST /users/:id/reject`).
3. **Admin loob otse** — `POST /users`. Konto on kohe `active`.

Ettevõtte kood üksi ei anna ligipääsu — see ütleb ainult, kellelt luba
küsitakse. Tagasi lükatud taotlus jääb alles `rejected` olekus, et sama
inimene ei saaks kohe uut taotlust esitada ja adminit spämmida.

`GET /users` tagastab ainult aktiivsed; ootel taotlused on eraldi
`GET /users/pending`, et need ei seguneks töötajate nimekirjaga.
`GET /me/dashboard` sisaldab adminile `pendingRequests` loendurit —
muidu jääks taotlus märkamatult seisma.

## Teadaolevad lihtsustused

- `POST /auth/logout` ei tühista tokeneid serveri poolel (stateless JWT).
  Kui vaja päris tühistamist (nt seadme vargus), lisada hiljem
  refresh-token-registri tabel.
- Parooli lähtestamine (`forgot-password`/`reset-password`, `password_resets`
  tabel) on veel portimata — vajab töötavat e-posti serverit.
- Liitumistaotlusest ei lähe adminile teavitust (e-kiri/push) — ta näeb
  seda dashboardi loenduris. Push-teavitused on eraldi töö.

## Struktuur

- `src/routes/auth.routes.ts` — login/refresh/logout, ettevõtte
  registreerimine, liitumistaotlus
- `src/routes/dashboard.routes.ts` — koondvaade (port `dashboard.php`)
- `src/routes/timeLogs.routes.ts` — start/end/ajalugu + kohaloleku sündmused
- `src/routes/users.routes.ts` — admini kasutajate CRUD + taotluste kinnitamine
- `src/utils/timeStats.ts` — tundide arvutus kohaloleku põhjal (**ühikutestid
  `timeStats.test.ts`, `npm test`** — see loogika toidab palgaarvestust)
- `src/utils/geofence.ts` — Haversine distants, kasutusel serveripoolses
  sisseregistreerimise kontrollis
- `src/utils/password.ts` — bcrypt ühilduvus PHP `password_hash()` hashidega

## Deploy Proxmoxi / serverisse

Kaks varianti, olenevalt sellest, kas serveris on juba MySQL:

- **Olemasolev MySQL** (nt sama server, kus vana PHP rakendus): kasuta
  `deploy/docker-compose.prod.yml` + `deploy/Caddyfile` — API konteiner +
  Caddy reverse proxy automaatse TLS-iga.
- **Puhas server, MySQL-i pole veel** (nt uus Proxmox VM): kasuta
  `deploy/docker-compose.with-mysql.yml`, mis lisab ka MySQL konteineri.
  **Oluline**: käivita alati `--env-file .env` lipuga (töökataloogist `api/`):
  ```bash
  docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env up -d --build
  ```
  Ilma selleta ei leia Compose `MYSQL_APP_PASSWORD` muutujat (vaikimisi
  otsitakse `.env` faili compose-faili enda kataloogist `deploy/`, mitte
  `api/`-st, kust käsku käivitatakse) ja MySQL käivitub tühja parooliga.

Pärast käivitamist: `docker compose ... exec api npx prisma db push` loob
tabelid, `npm run prisma:seed` (kohapeal, mitte konteineris — vt
`prisma:seed` skript ei ole toodangu image'is) või samaväärne otsene
Prisma-päring lisab esimesed test-kasutajad.
