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

## Teadaolevad lihtsustused (Faas 1 ulatus)

- `POST /auth/logout` ei tühista tokeneid serveri poolel (stateless JWT).
  Kui vaja päris tühistamist (nt seadme vargus), lisada hiljem
  refresh-token-registri tabel.
- Parooli lähtestamine (`forgot-password`/`reset-password`, `password_resets`
  tabel) ja admini CRUD (kasutajad/objektid) on veel portimata — Faas 3.
- `GET /me/dashboard` kuu-kokkuvõte ei lahuta lõunapause (port originaalist
  `dashboard.php`), aga `GET /time-logs` (töölugu) lahutab — see lahknevus
  on originaalis olemas ja on siia teadlikult üle kantud, mitte parandatud.

## Struktuur

- `src/routes/auth.routes.ts` — login/refresh/logout
- `src/routes/dashboard.routes.ts` — koondvaade (port `dashboard.php`)
- `src/routes/timeLogs.routes.ts` — start/end/ajalugu (port `start_work_action.php`,
  `end_work_action.php`, `work_history.php`)
- `src/utils/geofence.ts` — Haversine distants (port dashboardi brauseri-JS-ist)
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
