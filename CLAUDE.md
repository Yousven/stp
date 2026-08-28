# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mis see rakendus on

Tööajaarvestus ehitusettevõtetele (arendaja: Nutisemud). Lahendatav probleem on
üks: **töötaja oleks õigel ajal õigel objektil ja tunnid oleksid õiged** — keegi
ei saa kirja panna 10 tundi, kui ta oli objektil viis.

Kui mõni muudatus nõrgendab tõendit selle kohta, kus töötaja päriselt oli, on
see peaaegu alati vale muudatus — ka siis, kui see teeb midagi mugavamaks.

| Kaust | Mis | Tehnoloogiad |
|---|---|---|
| `api/` | REST API + MySQL | Node 22, TypeScript, Express, Prisma, Zod |
| `mobile/` | Telefoniäpp JA arvutiliides | React 19, Vite, Capacitor 8 |

Mõlemas kaustas on oma README sisulise taustaga; `SECURITY.md` kirjeldab lahtist
turvaküsimust (vana PHP rakenduse andmebaasiparool git-ajaloos, **vahetamata**).

## Käsud

### API (`api/`)

```bash
npm run dev            # http://localhost:3000/api/health
npm run typecheck
npm test
npx tsx --test src/utils/billing.test.ts    # üksik testifail
npx prisma db push     # skeem kohalikku dev-andmebaasi
npm run prisma:seed    # demo admin/employee, parool DevPassword123!
docker compose up -d   # kohalik MySQL + Adminer
```

Meeldetuletused sõltuvad kellaajast, seega neid saab testida ainult skriptiga:
`REMINDERS_ENABLED=false npx tsx scripts/test-reminders.ts demo`

### Mobiil (`mobile/`)

```bash
npm run dev            # http://localhost:5173, eeldab et api jookseb
npx tsc -b             # TÜÜBIKONTROLL — mitte tsc --noEmit
npm run lint
npm run build
npx cap sync ios       # või android, pärast iga web-buildi
./scripts/build-android-debug.sh
```

**`npx tsc --noEmit` ei kontrolli siin midagi** (tsconfig-viited) — see annab
tühja väljundi ka siis, kui koodis on kümneid vigu. Kasuta alati `tsc -b`.

### iOS-i vigade kontroll ilma Xcode'ita

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -configuration Debug CODE_SIGNING_ALLOWED=NO clean build 2>&1 | grep -E "(error|warning):"
```

`clean` on kohustuslik: ilma selleta jäävad juba kompileeritud failid vahele ja
hoiatused ei tule uuesti nähtavale. Tühi väljund = 0 viga, 0 hoiatust. Tee see
enne, kui ütled, et midagi on valmis.

## Git: pushi `stp`, mitte `origin`

- `origin` → `Yousven/smarttimeplanning.git` — **vale**, vana PHP repo
- `stp` → `Yousven/stp.git` — see projekt

Kasutaja `~/.ssh/config` seab `Host *` peale `Port 24`, mis lõhub GitHubi SSH.
Ära muuda tema SSH-konfiguratsiooni, vaid prefiksi push:

```bash
GIT_SSH_COMMAND="ssh -p 22 -o User=git" git push stp main
```

Bare `git push` avaldab uue toote ajaloo vanasse repositooriumi — juhtunud üks
kord juba.

## Server ja deploy

Ubuntu 24.04 VM Proxmoxis, `ssh margo@192.168.28.107 -p24`, projekt `/opt/stp`
(seal on remote nimega `origin`, mis osutab `stp` repole). Konteinerid:
`deploy-api-1`, `deploy-mysql-1`, `cloudflared` (tunnel `api.nutisemud.ee` →
`http://api:3000`). Sama aadress serveerib nii API-t (`/api`) kui
arvutiliidest (`/`).

```bash
cd /opt/stp && git pull origin main
cd api && docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env up -d --build
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env exec api npx prisma db push
```

`--env-file .env` on kohustuslik, muidu käivitub MySQL vale parooliga. Täpsemad
sammud: `api/deploy/RUNBOOK.md`.

**Varundus käib VM-i hetktõmmisena Proxmoxis** — ära ehita mysqldump-cron'e ega
retentsioonipoliitikaid, see on teadlikult ühe kihi võrra allpool lahendatud.

Auto-režiimi klassifikaator blokeerib osa serveri käske (`.env` muutmine,
`docker compose up --build`, `prisma db push`). Kui see juhtub: **proovi käsk
ise ära ja lase loaküsimisel kasutajani jõuda** — ära kirjuta käske kasutajale
kopeerimiseks välja.

## Arhitektuuri tuum

### Petmisvastane kohaloleku ahel

1. **Sisseregistreerimine** — äpp saadab koordinaadid, **server** kontrollib
   kaugust (`routes/timeLogs.routes.ts` + `utils/geofence.ts`). Kuna kontroll on
   serveris, ei aita äpi muutmine. Telefoni teatatud GPS-täpsus lisatakse
   raadiusele (kuni 100 m).
2. **Kohalolek** — ENTER/EXIT append-only tabelis `presence_events`. Objektilt
   lahkumine **peatab kella**, ei lõpeta tööpäeva.
3. **Tunnid** — `utils/timeStats.ts` liidab kohalolekuintervallid. Toidab
   palgaarvestust, ühikutestidega; muudatuse korral täienda teste.
4. **Admini käsitsi muudatus** nõuab põhjendust ja läheb `audit_logs`-i koos
   vana ja uue väärtusega.

### Aku: mida MITTE teha

Taustajälgimine kasutab OS-i geofencing't (iOS `CLCircularRegion`, Android
`GeofencingClient`) — OS äratab äpi ainult piiri ületamisel.

**Koodis ei tohi olla `watchPosition`, `startUpdatingLocation` ega
`requestLocationUpdates`.** Aku-kaebuse korral kontrolli seda esimesena.
iOS-i pluginas on `allowsBackgroundLocationUpdates` ja
`pausesLocationUpdatesAutomatically` **tahtlikult seadmata**.

Esiplaani asukoht käib `mobile/src/api/location.ts` kaudu, mis hoiab viimast
mõõtmist 45 s ja teeb otsingu **ette ära** juba ekraani avamisel — nupuvajutusel
alustamine tähendas kuni 20 s ootamist.

### Kaks liidest ühest koodibaasist

`mobile/src/hooks/useLayout.ts` otsustab: natiivne äpp on **alati**
telefoniliides (ka iPadil), brauseris otsustab akna laius (≥ 900 px = arvuti).
Erinevus on täpselt kahes kohas, sisulehed ise ei tea, kummas nad on:

- `ProtectedRoute` mähib arvutis lehe `DesktopShell`-i (püsiv külgmenüü)
- `DashboardPage` renderdab arvutis `DesktopOverview` — teine sisu, mitte sama
  vaade laiemalt (`GET /me/org-status`: kes on praegu objektil)

**Tööpäeva alustamine/lõpetamine on arvutis välja lülitatud** — asukohta ei ole
millegagi tõendada. Uut lehte lisades: kui see puudutab tööaja registreerimist,
kontrolli `useLayout()`; kui see on haldusleht, lisa link `DesktopShell`-i.

Arvutiliidest serveerib API konteiner (`api/src/app.ts` lõpp), seega
**Docker-buildi kontekst on repo juur, mitte `api/`**.

### Offline

- `/time-logs/start` ja `/end` võtavad `occurredAt` — aja, mil töötaja tegevuse
  tegi, mitte mil päring kohale jõudis.
- Server ei usu telefoni kella pimesi: üle 5 min tulevikku ja üle 7 päeva vanad
  kirjed lükatakse tagasi; nihe salvestub `clock_drift_seconds`-i.
- **Asukohakontroll kehtib ka offline'is.**
- `offlineQueue.ts`: serveri **sisuline** keeldumine (nt "liiga kaugel") EI lähe
  järjekorda — ainult võrgutõrge.

### Arveldus

`work_types` (MIS tööd, ettevõtte ühine nimekiri) → `object_work_types`
(millised tööliigid ühel objektil ja mis hinnaga) → `clients` (tellija, kellele
arve läheb). Tunnihind tugevamast nõrgemani: objekti tööliigi hind → tööliigi
vaikehind → objekti üldhind → **arveldamata**. Viimane ei ole null eurot:
hinnata tunnid jäävad arvelt välja ja loetakse eraldi. Loogika
`utils/billing.ts`, testid `billing.test.ts`.

Arve **ei ole raport**: read, summad ja rekvisiidid on hetktõmmis, seega hilisem
hinnamuutus ei muuda esitatud arvet. `time_logs.invoice_id` on ainus asi, mis
hoiab ära sama tunni teistkordse arveldamise.

## Reeglid, mida rikkuda on lihtne

**Neli keelt, eesti on lähtekeel.** `api/src/i18n/messages.ts` ja
`mobile/src/i18n/{et,en,ru,uk}.ts`. Teised keeled on typitud eesti keele järgi,
seega **puuduv võti on kompileerimisviga**. Vene keel ei ole "lisakeel" — see on
paljude ehitustöötajate emakeel. Iga uus tekst kõigis neljas korraga.

**Kujundus on ehitusobjekti, mitte kontorilaua jaoks.** Kasutaja on kindaga,
päikese käes, kiirustab, ei ole IT-inimene ega pruugi eesti keelt lugeda. Üks
ilmselge põhitegevus ekraani kohta, vähim puuteala 52 px (põhinupp 72 px), ikoon
iga sildi kõrval, värv kannab tähendust (roheline = kell käib, punane = objektilt
väljas). Haldus eraldi rühmas. Ikoonid `components/Icon.tsx`, ilma teegita.

**Tühi väli tähendab "määramata", mitte nulli** — hinnaväljal salvestub tühi
sisend `null`-ina; 0 tähendaks tasuta tehtud tööd.

**Ekraanil olev kell ei ole tõend.** `hooks/useElapsed.ts` näitab telefoni
kellast; palgatunnid arvutab alati server. Hook peab taluma taustale minekut:
iOS peatab WebView taimerid ja näit tuleb esiplaanile naastes kohe uuesti
arvutada.

## Teadaolevad lahtised otsad

- Push on koodis valmis, aga **seadistamata** (Firebase puudub); iOS push nõuab
  tasulist Apple Developer kontot.
- SMTP seadistamata — e-kirjad ainult logitakse.
- `POST /auth/logout` ei tühista tokeneid serveris (stateless JWT).
- Vana PHP andmebaasiparool on git-ajaloos ja kehtib, kuni see vahetatakse —
  vt `SECURITY.md`.

## Codex config

Masinal on `~/.codex/config.toml`. Ülevõtmiseks vasta `/import` (skaneerib ja
loetleb), seejärel `/import --yes=<digest>`. Ära loe seda faili ise ega kirjuta
Claude Code'i konfiguratsiooni käsitsi.
