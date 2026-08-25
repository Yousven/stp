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

## Teavitused (push + e-post)

Millal midagi saadetakse:

| Sündmus | Kellele |
|---|---|
| Uus liitumistaotlus | Ettevõtte adminidele (push) |
| Taotlus kinnitatud / tagasi lükatud | Taotlejale (push) |
| Sisseregistreerimine tegemata (tähtaeg möödas) | Töötajale (push) + adminile (push + e-post) |
| Tööpäev lõpetamata (tähtaeg möödas) | Töötajale (push) + adminile (push + e-post) |

Tähtajad tulevad iga ettevõtte enda seadetest (`check_in_deadline`,
`check_out_deadline`, `admin_email`). Taustatöö käib **iga 15 minuti tagant**,
kuna tähtajad on ettevõtete kaupa erinevad; `reminder_logs` tabel tagab, et
sama päeva teavitus läheb välja täpselt üks kord.

**Ilma mandaatideta rakendus töötab edasi** — teavitused lihtsalt logitakse
konsooli. Serveri käivitusteade ütleb selgelt, kumb on seadistatud, et
seadistamata push ei paistaks töötavana.

### Push-teavituste seadistamine (Firebase)

1. [console.firebase.google.com](https://console.firebase.google.com) → uus projekt
2. **Android**: lisa Android-äpp package nimega `ee.nutisemud.smarttimeplanning`,
   laadi alla `google-services.json` → pane faili
   `mobile/android/app/google-services.json` (build lisab plugina automaatselt,
   kui fail on olemas — vt `android/app/build.gradle` lõpp)
3. **iOS**: nõuab **tasulist Apple Developer kontot** (99$/a). Tasuta
   "Personal Team" allkirjastamine EI toeta Push Notifications võimekust
   üldse — see on Apple'i piirang, mitte rakenduse oma. Kui konto on olemas:
   loo APNs Auth Key (.p8) ja laadi see Firebase'i, lisa Xcode's
   Signing & Capabilities → + Capability → Push Notifications.
4. **Server**: Firebase Project settings → Service accounts → Generate new
   private key. JSON-ist võta `project_id`, `client_email`, `private_key`
   ja pane `.env` faili (vt `.env.example`).

### E-posti seadistamine

Täida `.env`-s `SMTP_*` väärtused. Gmailiga on vaja
[app password](https://support.google.com/accounts/answer/185833), mitte
tavaparooli.

### Meeldetuletuste käsitsi testimine

Meeldetuletused sõltuvad kellaajast, seega tavaliselt ei saa neid suvalisel
hetkel käivitada. Testiskript seab tähtajad ajutiselt 00:00 peale, käivitab
töö ja taastab seaded:

```bash
REMINDERS_ENABLED=false npx tsx scripts/test-reminders.ts demo
```

## Töötamine ilma levita (offline)

Ehitusobjektil — keldris, metallkonstruktsioonide vahel, maapiirkonnas — võib
levi puududa terve päeva. Seetõttu peab telefon suutma tööpäeva nii alustada
kui lõpetada ilma serverita ja saata tehtu ära hiljem.

- `POST /time-logs/start` ja `POST /time-logs/:id/end` võtavad valikulise
  `occurredAt` välja: **aeg, mil töötaja tegevuse tegi**, mitte aeg, mil
  päring serverisse jõudis. Tunnid arvestatakse selle järgi.
- Server ei usu telefoni kella pimesi. Tulevikku näitav kell (üle 5 minuti)
  ja üle 7 päeva vanad kirjed lükatakse tagasi; vahepealne kellanihe
  salvestatakse `time_logs.clock_drift_seconds`-i ja kirje märgitakse
  `created_offline`-iks, et admin näeks, mis tuli järelsaadetuna.
- **Asukohakontroll kehtib ka offline'is.** Koordinaadid salvestatakse
  telefonis tegevuse hetkel ja server kontrollib neid saatmisel — offline ei
  ole viis objektilt eemalt sisse registreerida.

Telefoni pool (`mobile/src/api/offlineQueue.ts`) hoiab järjekorda ja saadab
selle ära äpi avamisel, `online` sündmusel ja taustalt naasmisel. Serveri
sisuline keeldumine (nt "oled objektist liiga kaugel") **ei** lähe järjekorda
— see näidatakse kasutajale kohe, sest kordamine annaks sama vastuse.

## Teadaolevad lihtsustused

- `POST /auth/logout` ei tühista tokeneid serveri poolel (stateless JWT).
  Kui vaja päris tühistamist (nt seadme vargus), lisada hiljem
  refresh-token-registri tabel.
- Parooli lähtestamine (`forgot-password`/`reset-password`, `password_resets`
  tabel) on veel portimata — vajab töötavat e-posti serverit.
- Push-teavituste kohalejõudmist ei kinnitata: FCM võtab sõnumi vastu, aga
  seda, kas telefon selle päriselt kuvas, server ei tea. Aegunud tokenid
  (`UNREGISTERED`) koristatakse automaatselt ära.
- iOS push nõuab tasulist Apple Developer kontot — vt ülalt.

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
