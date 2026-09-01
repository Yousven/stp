# website/ — SmartTimePlanningu turundusveeb

Avalik turundusleht aadressil **`stp.nutisemud.ee`**. Ülejäänud repost
sõltumatu: ei impordi `api/`-st ega `mobile/`-ist, ei lähe API
Docker-image'i sisse ja tal on oma deploy.

- **Mis ja kellele** — [`CLAUDE.md`](CLAUDE.md)
- **Struktuur, sektsioonid, animatsioonid** — [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- **Fondid, värvid, pildid** — [`ASSETS.md`](ASSETS.md)
- **Avaldamise blokeerijad ja Cloudflare'i sammud** — [`LAUNCH.md`](LAUNCH.md)

## Käivitamine

```bash
cd website
npm install
npm run dev            # http://localhost:4321
```

Leht on **staatiline** — API-t ega andmebaasi ei ole vaja. Kõik
tootekaadrid on juba `src/assets/app/` all olemas.

Keeled: `/` (eesti), `/en/`, `/ru/`, `/uk/`.

## Käsud

```bash
npm run dev            # arendusserver
npm run build          # staatiline väljund → dist/ + dist/_headers
npm run preview        # vaata buildi tulemust (ILMA turvapäisteta)
npm run typecheck      # astro check
npm run lint           # eslint
```

`npm run build` on kaheosaline: `astro build` ja seejärel
`scripts/build-headers.mjs`, mis genereerib `dist/_headers`
(CSP koos inline-skriptide räsidega, HSTS, vahemälu). Kui buildi käsku
muudetakse, kaovad turvapäised.

## Production buildi testimine lokaalselt

`astro preview` **ei rakenda `_headers`-it**, seega CSP-d ega
turvapäiseid sellega kontrollida ei saa. Selleks on eraldi server, mis
matkib Cloudflare Pages'i (päised `_headers` failist, gzip, 404):

```bash
npm run build
node scripts/serve-dist.mjs        # http://localhost:4330
```

Sama, aga teisest arvutist ligipääsetavana: server kuulab juba
`0.0.0.0`-l, seega kasuta masina LAN-aadressi.

HSTS jäetakse selles serveris saatmata — see on https-i päis ja
brauserisse salvestatuna murraks ta kohaliku http-testimise. Production'is
saadab ta Cloudflare.

## Kontrollid

```bash
# Peamine: 4 keelt × 8 laiust (360…1920)
node scripts/qa.mjs
node scripts/qa.mjs --shots        # + sektsioonipildid .review/ alla
node scripts/qa.mjs --webkit       # sama Safari mootoril

# Interaktsioonid: ankrud, keelevahetus, resize, refresh keset lehte,
# CTA-d, analytics, käitumine ilma JS-ita
node scripts/qa-interaction.mjs [--webkit]

# Ligipääsetavus: pealkirjad, maamärgid, fookus, kontrast, klaviatuur
node scripts/qa-a11y.mjs [--webkit]

# Tõmmiste kärpenumbrid allikpildist mõõdetuna
node scripts/measure-crop.mjs
```

Kõik võtavad sihtkoha `SITE_URL`-ist (vaikimisi `http://localhost:4321`).
Production buildi vastu:

```bash
SITE_URL=http://localhost:4330 node scripts/qa.mjs
```

WebKit tuleb enne esimest korda alla laadida:

```bash
npx playwright-core install webkit
```

QA kontrollib seda, mida build ei näe: horisontaalne ülevool, katkised või
laadimata pildid, konsoolivead (sh CSP-rikkumised), 4xx-päringud,
pealkirjade hierarhia, `alt`-tekstid, `prefers-reduced-motion` (sisu peab
olema täielikult nähtav ja ilma pinnita) ning **animatsioonide lõppseis** —
leht keritakse lõpuni ja iga peidetud algseisuga element peab olema
nähtavaks jõudnud.

Viimane on `scrub`-arhitektuuri ainus päris oht: kui trigger'i `end` ei ole
kerimisega saavutatav, jääks sisu poolenisti peitu ja seda ei näitaks ei
build ega tüübikontroll.

## Tootekaadrite uuendamine

Turunduslehel EI kasutata joonistatud äpi UI-d — pildid tulevad päris
rakendusest demoandmetega. Vt [`ASSETS.md`](ASSETS.md) ptk 3 täpsete
sammudega; lühidalt:

```bash
# 1. eraldi demo-andmebaas (MITTE time_tracking)
docker exec api-mysql-1 mysql -uroot -pdevrootpassword \
  -e "CREATE DATABASE IF NOT EXISTS stp_demo; GRANT ALL ON stp_demo.* TO 'app'@'%'; FLUSH PRIVILEGES;"

cd api
DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npx prisma db push
DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npm run prisma:seed
DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_demo" npm run dev

# 2. neutraalsed demoandmed
cd ../website && node scripts/demo-seed.mjs

# 3. mobiili dev-server sellele API-le
echo 'VITE_API_BASE_URL="http://localhost:3000/api"' > ../mobile/.env.development.local
npm --prefix ../mobile run dev

# 4. tõmmised
node scripts/capture-app-ui.mjs

# 5. KORISTA: ajutine env-fail maha, demo-andmebaas maha
rm ../mobile/.env.development.local
docker exec api-mysql-1 mysql -uroot -pdevrootpassword -e "DROP DATABASE stp_demo;"
```

OG-pilt tehakse eraldi ja ainult siis, kui sõnum või värv muutub:

```bash
node scripts/og-image.mjs      # → public/og.png
```

## Deploy — Cloudflare Pages

Turundusveeb on API VM-ist ja olemasolevast deploy pipeline'ist **täiesti
eraldi**. Katkine build siin ei saa API-t ega arvutiliidest maha võtta.

### Projekti seaded

| Väli | Väärtus |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `website` |
| Node version | `22` |

### Keskkonnamuutuja

| Nimi | Väärtus | Kus |
|---|---|---|
| `PUBLIC_CTA_URL` | `https://api.nutisemud.ee/register` | Production + Preview |

Vigane väärtus **katkestab buildi** (`src/config/site.ts`) — see on
tahtlik: parem katkine build kui avaldatud leht, mille ainus nupp ei vii
kuhugi.

Täielik avaldamise kontrollnimekiri: [`LAUNCH.md`](LAUNCH.md).

Turundusleht **ei ehita oma registreerumist ega autentimist** — CTA viitab
olemasolevasse veebiliidesesse. Ilma muutujata kasutatakse sama väärtust
vaikimisi (`src/config/site.ts`), seega leht ei lähe katki; muutuja on
selleks, et aadressi saaks muuta ilma koodi puutumata.

### Domeen

`stp.nutisemud.ee` lisatakse Pages'i projektile custom domain'ina ja
Cloudflare loob CNAME-kirje ise.

**`api.nutisemud.ee` jääb puutumata** — see on uus kirje, mitte muudatus
olemasolevas. `cloudflared` tunneli konfiguratsiooni ei muudeta.

### Mida deploy juures EI tehta

- ei muudeta `cloudflared` tunneli seadistust
- ei lisata konteinerit `api/deploy/docker-compose.*.yml`-i
- ei puudutata `api/Dockerfile`-i
- ei looda `app.stp.nutisemud.ee` hosti

Repo juure `.dockerignore` sisaldab rida `website`, mis hoiab selle kausta
API Docker-buildi kontekstist väljas. Kontrolli, et see on alles:

```bash
grep -n website ../.dockerignore
```
