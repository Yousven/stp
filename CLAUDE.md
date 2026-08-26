# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mis see rakendus on

Tööajaarvestus ehitusettevõtetele (arendaja: Nutisemud). Lahendatav probleem on
üks konkreetne asi: **töötaja oleks õigel ajal õigel objektil ja tunnid oleksid
õiged** — keegi ei saa kirja panna 10 tundi, kui ta oli objektil viis.

Kogu ülejäänud funktsionaalsus teenib seda eesmärki. Kui mõni muudatus nõrgendab
tõendit selle kohta, kus töötaja päriselt oli, on see peaaegu alati vale
muudatus, ka siis kui see teeb midagi mugavamaks.

Kaks osa ühes repos:

| Kaust | Mis | Peamised tehnoloogiad |
|---|---|---|
| `api/` | REST API + MySQL | Node 22, TypeScript, Express, Prisma, Zod |
| `mobile/` | Töötaja äpp JA arvutiliides | React 19, Vite, Capacitor 8 (iOS + Android) |

`mobile/` ei ole ainult telefoniäpp: sama build serveeritakse brauserile
arvutiliidesena (`api/Dockerfile` ehitab selle API image'i sisse). Vt
"Kaks liidest ühest koodibaasist" allpool.

Mõlemas kaustas on oma README, kus on rohkem sisulist tausta kui siin failis.
`SECURITY.md` juurkaustas kirjeldab ühte lahtist turvaküsimust (vana PHP
rakenduse andmebaasiparool git-ajaloos, **vahetamata**).

## Käsud

### API (`api/`)

```bash
npm run dev            # tsx watch, http://localhost:3000/api/health
npm run typecheck      # tsc --noEmit
npm test               # tsx --test src/**/*.test.ts
npx tsx --test src/utils/billing.test.ts    # üksik testifail
npm run prisma:generate
npx prisma db push     # skeem kohalikku dev-andmebaasi
npm run prisma:seed    # demo admin/employee, parool DevPassword123!
```

Kohalik MySQL + Adminer: `docker compose up -d` (`api/` kaustas).

Meeldetuletuste taustatööd saab käsitsi testida ainult nii, sest need sõltuvad
kellaajast:

```bash
REMINDERS_ENABLED=false npx tsx scripts/test-reminders.ts demo
```

### Mobiil (`mobile/`)

```bash
npm run dev            # http://localhost:5173, eeldab et api jookseb
npx tsc -b             # TÜÜBIKONTROLL — mitte `tsc --noEmit`, vt allpool
npm run lint           # oxlint
npm run build          # tsc -b && vite build
npx cap sync ios       # pärast iga web-buildi, enne Xcode'i
```

**`npx tsc --noEmit` ei kontrolli siin midagi** — projekt kasutab
tsconfig-viiteid (`tsconfig.app.json` / `tsconfig.node.json`). Kasuta alati
`npx tsc -b`, muidu jäävad vead märkamata ja tundub ekslikult, et kõik on korras.

### iOS-i vigade kontroll ilma Xcode'ita

Xcode'i Issue Navigatori sisu saab käsurealt kätte, allkirjastamist pole vaja:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -configuration Debug CODE_SIGNING_ALLOWED=NO clean build 2>&1 | grep -E "(error|warning):"
```

`clean` on oluline: ilma selleta jätab Xcode juba kompileeritud failid vahele ja
hoiatused ei tule uuesti nähtavale, mis jätab vale mulje puhtast projektist.
Tühi väljund = 0 viga, 0 hoiatust. Tee see enne, kui ütled, et midagi on valmis.

Android: `./scripts/build-android-debug.sh` (SDK ja mõlemad JDK-d on masinas
olemas, vt mobile/README.md).

## Git: pushi `stp`, mitte `origin`

Töökoopial on kaks remote'i ja `origin` on **vale**:

- `origin` → `Yousven/smarttimeplanning.git` — vana PHP rakenduse repo
- `stp` → `Yousven/stp.git` — see projekt

Kasutaja `~/.ssh/config` seab `Host *` peale `Port 24`, mis lõhub GitHubi SSH.
Ära muuda tema SSH-konfiguratsiooni, vaid prefiksi push:

```bash
GIT_SSH_COMMAND="ssh -p 22 -o User=git" git push stp main
```

Bare `git push` avaldab uue toote ajaloo vanasse repositooriumi. See on juba
ühe korra juhtunud.

## Server ja deploy

Ubuntu 24.04 VM Proxmoxis, projekt `/opt/stp`, ligipääs `ssh margo@192.168.28.107 -p24`.
Serveris on remote nimega `origin`, mis osutab `stp` repole (erinevalt
töökoopiast).

Kolm konteinerit: `deploy-api-1` (port 3000), `deploy-mysql-1`, `cloudflared`
(tunnel `api.nutisemud.ee` → `http://api:3000`). Avalik API:
`https://api.nutisemud.ee/api`.

Deploy sammud on `api/deploy/RUNBOOK.md`. Lühidalt:

```bash
cd /opt/stp && git pull origin main
cd api && docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env up -d --build
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env exec api npx prisma db push
```

`--env-file .env` on kohustuslik — ilma selleta ei leia compose
`MYSQL_APP_PASSWORD` muutujat ja MySQL käivitub vale parooliga.

**Varundus käib VM-i hetktõmmisena Proxmoxis.** Ära ehita andmebaasi
varundustööriistu — mysqldump cron'e, retentsioonipoliitikaid — see on
teadlikult ühe kihi võrra allpool lahendatud.

Auto-režiimi klassifikaator blokeerib osa serveri käske (`.env` muutmine,
`docker compose up --build`, `prisma db push`). Kui see juhtub: **proovi käsk
ise ära ja lase loaküsimisel kasutajani jõuda**, ära kirjuta käske kasutajale
kopeerimiseks välja. Alles siis, kui ta keeldub, selgita samme käsitsi.

## Arhitektuuri tuum

### Petmisvastane kohaloleku ahel

See on kogu süsteemi mõte ja seda ei tohi vaikselt lahjendada.

1. **Sisseregistreerimine** — äpp saadab koordinaadid, **server** kontrollib
   kaugust objektist (`api/src/routes/timeLogs.routes.ts` + `utils/geofence.ts`)
   ja keeldub, kui oled väljas. Kuna kontroll on serveris, ei aita äpi muutmine.
   Telefoni teatatud GPS-täpsus lisatakse lubatud raadiusele (kuni 100 m).
2. **Kohaloleku jälgimine** — ENTER/EXIT sündmused kirjutatakse append-only
   tabelisse `presence_events`. Objektilt lahkumine **peatab kella**, ei lõpeta
   tööpäeva.
3. **Tundide arvutus** — `api/src/utils/timeStats.ts` liidab kohalolekuintervallid.
   See funktsioon toidab palgaarvestust; sellel on ühikutestid ja neid tuleb
   muudatuse korral täiendada.
4. **Admini käsitsi muudatus** nõuab põhjendust ja läheb `audit_logs` tabelisse
   koos vana ja uue väärtusega. Ilma selleta oleks tõend väärtusetu.

### Kaks liidest ühest koodibaasist

`mobile/src/hooks/useLayout.ts` otsustab, kumb liides käib. Natiivne äpp on
**alati** telefoniliides, ka iPadil. Brauseris otsustab akna laius (≥ 900 px
= arvuti).

Erinevus on täpselt kahes kohas — sisulehed ise ei tea, kummas nad on:

- `ProtectedRoute` mähib arvutiliideses lehe `DesktopShell`-i (püsiv
  külgmenüü). Telefonis on navigeerimine dashboardi paanidena.
- `DashboardPage` renderdab arvutis `DesktopOverview` — teine sisu, mitte
  sama vaade laiemalt: juhataja küsimus on "kes on praegu objektil"
  (`GET /me/org-status`), töötaja oma "kaua ma juba teinud olen".

**Tööpäeva alustamine ja lõpetamine on arvutis välja lülitatud** — asukohta
ei ole millegagi tõendada. Uut lehte lisades: kui see puudutab tööaja
registreerimist, kontrolli `useLayout()`; kui see on haldusleht, lisa link
`DesktopShell`-i menüüsse.

Brauseriversiooni serveerib API konteiner (`api/src/app.ts` lõpp). Seetõttu
on **Docker-buildi kontekst repo juur, mitte `api/`**, ja image'i sees
kirjutatakse `VITE_API_BASE_URL="/api"` üle, et brauseriklient räägiks sama
päritoluga.

### Aku: mida MITTE teha

Taustajälgimine kasutab OS-i enda geofencing't — iOS `CLCircularRegion` region
monitoring, Android Play Services `GeofencingClient`. OS valvab ringi odavate
signaalidega (mastid, WiFi) ja äratab äpi ainult piiri ületamisel.

**Kuskil koodis ei tohi olla `watchPosition`, `startUpdatingLocation` ega
`requestLocationUpdates`.** Kui aku-kaebus tuleb, kontrolli seda esimesena —
see oleks päris põhjus, mitte region monitoring.

iOS-i pluginas on `allowsBackgroundLocationUpdates` ja
`pausesLocationUpdatesAutomatically` **tahtlikult seadmata**; teine neist
lülitaks välja just selle energiasäästu, mis pideva jälgimise vahele paneb.
Esiplaani asukoht käib läbi `mobile/src/api/location.ts`, mis hoiab viimast
mõõtmist 45 sekundit — nii ei ärata dashboardi avamine iga kord raadiot.

Sama moodul teeb otsingu **ette ära**, kui tööpäeva alustamise ekraan avatakse.
Otsingu jätmine nupuvajutuse hetkele tähendas kuni 20-sekundilist ootamist.

### Offline

Terve tööpäev peab käima ilma levita: keldris, metallkonstruktsioonide vahel.

- `POST /time-logs/start` ja `/end` võtavad `occurredAt` — aja, mil töötaja
  tegevuse tegi, mitte mil päring kohale jõudis.
- Server ei usu telefoni kella pimesi: üle 5 min tulevikku ja üle 7 päeva vanad
  kirjed lükatakse tagasi, vahepealne nihe salvestub `clock_drift_seconds`-i ja
  kirje märgitakse `created_offline`-iks.
- **Asukohakontroll kehtib ka offline'is** — koordinaadid salvestatakse tegevuse
  hetkel ja server kontrollib neid saatmisel.
- `mobile/src/api/offlineQueue.ts` hoiab järjekorda. Serveri **sisuline**
  keeldumine (nt "oled liiga kaugel") EI lähe järjekorda — kordamine annaks sama
  vastuse; ainult võrgutõrge läheb.

### Tööliigid, tellijad ja arved

Kolm eraldi asja, mis olid varem ekslikult üks tabel (`cost_codes`):

- `work_types` — MIS tööd tehakse (lammutus, maalritöö). Ettevõtte ühine
  nimekiri. Ainult nimi on kohustuslik; kood on vabatahtlik.
- `object_work_types` — millised tööliigid ühel objektil käivad ja mis hinnaga.
  See lubab olukorra, kus samal objektil lammutab kolm meest, maalib üks ja
  koristab üks, ja kõik lähevad arvele oma hinnaga.
- `clients` — tellija ettevõte rekvisiitidega. Objekt viitab tellijale.

Tunnihind valitakse tugevamast nõrgemani: objekti tööliigi hind → tööliigi
vaikehind → objekti üldhind → **arveldamata**. Viimane ei ole null eurot:
hinnata tunnid jäävad arvelt välja ja loetakse eraldi (`unbilledHours`), sest
puuduv seadistus ei tohi vaikselt muutuda tasuta tehtud tööks. Loogika:
`api/src/utils/billing.ts`, testid `billing.test.ts`.

Arve **ei ole raport**. Read, summad ja mõlema poole rekvisiidid salvestatakse
hetktõmmisena, seega hilisem hinnamuutus ei muuda juba esitatud arvet. Arvele
läinud töölogid saavad `time_logs.invoice_id` — see on ainus asi, mis hoiab ära
sama tunni teistkordse arveldamise. Tühistamine vabastab tunnid, aga number
jääb kasutusele.

## Reeglid, mida rikkuda on lihtne

**Neli keelt, eesti on lähtekeel.** Sõnastikud: `api/src/i18n/messages.ts`
(serveri veateated) ja `mobile/src/i18n/{et,en,ru,uk}.ts`. Teised keeled on
typitud eesti keele järgi, seega **puuduv võti on kompileerimisviga**. Vene keel
ei ole siin "lisakeel" — Eesti ehitussektoris on see paljude töötajate emakeel.
Iga uus kasutajale nähtav tekst tuleb lisada kõigis neljas keeles korraga.

**Kujundus on ehitusobjekti, mitte kontorilaua jaoks.** Kasutaja on tihti
kindaga, päikese käes, kiirustab, ei ole IT-inimene ja ei pruugi eesti keelt
lugeda. Üks ilmselge põhitegevus ekraani kohta, vähim puuteala 52 px (põhinupp
72 px), ikoon iga sildi kõrval, värv kannab tähendust (roheline = kell käib,
punane = objektilt väljas). Haldus on eraldi rühmas — objektil olev töötaja ei
pea sinna kunagi jõudma. Ikoonid on `mobile/src/components/Icon.tsx` sees, ilma
teegita.

**Tühi väli tähendab "määramata", mitte nulli.** Hinnaväljadel salvestatakse
tühi sisend `null`-ina, mitte nullina — 0 tähendaks tasuta tehtud tööd.

**Ekraanil olev kell ei ole tõend.** `mobile/src/hooks/useElapsed.ts` näitab
kulunud aega telefoni kellast; palgale minevad tunnid arvutab alati server.
Hook peab taluma taustale minekut: iOS peatab WebView taimerid ja näit tuleb
esiplaanile naastes kohe uuesti arvutada, mitte oodata järgmist tiksu.

## Teadaolevad lahtised otsad

- Push-teavitused on koodis valmis, aga **seadistamata** (Firebase puudub).
  iOS push nõuab tasulist Apple Developer kontot — seda ei saa koodiga lahendada.
- SMTP on seadistamata, seega e-kirjad ainult logitakse konsooli.
- `POST /auth/logout` ei tühista tokeneid serveri poolel (stateless JWT);
  `token_revocations` tabel on olemas seadme kaotuse juhuks.
- Vana PHP rakenduse andmebaasiparool on git-ajaloos ja **kehtib seni, kuni see
  vahetatakse** — vt `SECURITY.md`.

## Codex config

Masinal on `~/.codex/config.toml`. Kui kasutaja soovib sealt asju üle tuua
(MCP-serverid, slash-käsud, subagendid, oskused, juhised), vasta `/import`, mis
skaneerib ja loetleb ülekantava; seejärel `/import --yes=<digest>`. Ära loe seda
faili ise ega kirjuta Claude Code'i konfiguratsiooni käsitsi — deterministlik
import rakendab nime- ja teekontrollid.
