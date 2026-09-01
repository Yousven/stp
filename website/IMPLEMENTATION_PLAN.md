# Rakendusplaan — website/

**Rakenduse kirjeldus, mitte enam plaan.** Kogu leht S1–S10 on valmis;
see fail kirjeldab, mis sai tehtud ja miks. Otsused ja piirid on
[`CLAUDE.md`](CLAUDE.md)-s, varad [`ASSETS.md`](ASSETS.md)-s,
käivitamine ja deploy [`README.md`](README.md)-s.

---

## 1. Projekti struktuur

```
website/
├── README.md · CLAUDE.md · IMPLEMENTATION_PLAN.md · ASSETS.md
├── astro.config.mjs        # static, i18n (et juurpolgul), sitemap
├── eslint.config.js
├── .env.example            # PUBLIC_CTA_URL
├── scripts/
│   ├── demo-seed.mjs       # neutraalsed demoandmed API kaudu
│   ├── capture-app-ui.mjs  # päris äpi tõmmised
│   ├── og-image.mjs        # OG-pilt lehe enda kujundusega
│   └── qa.mjs              # brauseri-QA: keeled, laiused, reduced-motion
├── public/
│   ├── fonts/              # 16 woff2, self-hostitud
│   ├── favicon.svg · og.png · robots.txt
└── src/
    ├── assets/app/         # 9 päris tootekaadrit
    ├── config/site.ts      # domeen, CTA, hind, demo-objekt
    ├── i18n/{et,en,ru,uk}.ts + index.ts
    ├── styles/{fonts,tokens,global}.css
    ├── lib/gsap.ts
    ├── layouts/BaseLayout.astro
    ├── components/
    │   ├── hud/            # HudLabel, StatusPill, SitePlan
    │   ├── ui/             # Nav, Cta, Footer
    │   └── sections/       # S1–S10, üks fail sektsiooni kohta
    └── pages/
        ├── index.astro       # et
        └── [lang]/index.astro  # en, ru, uk
```

**Üks leht.** Alamlehti (hinnakiri, tingimused, privaatsus) lisame alles
siis, kui neid päriselt vaja on — mitte ette.

### `src/config/site.ts`

Kõik, mis võib muutuda ilma kujundust puutumata:

```ts
export const site = {
  domain: "stp.nutisemud.ee",
  url: "https://stp.nutisemud.ee",

  // CTA sihtkoht. Turundusleht EI ehita oma registreerumisvoogu — see
  // viitab olemasolevasse veebiliidesesse. Ülekirjutatav Cloudflare
  // Pages'i build-keskkonnas, ilma koodi puutumata.
  ctaUrl: import.meta.env.PUBLIC_CTA_URL ?? "https://api.nutisemud.ee/register",

  pricing: { pricePerSeatEur: 5, trialDays: 14 },
  vendor: { name: "Nutisemud", product: "SmartTimePlanning" },
  demoSite: { name: "Riia 24", lat: 58.3742, lon: 26.718, radiusM: 120 },
} as const;
```

Numbrid peavad kattuma koodiga (`TRIAL_DAYS`, `PRICE_PER_SEAT_EUR`) — vt
`CLAUDE.md` peatükki "Faktid, mida veeb väidab".

---

## 2. Tehniline alus

| Asi | Valik | Miks |
|---|---|---|
| Raamistik | Astro, `output: "static"` | SEO ja laadimiskiirus |
| Keel | TypeScript, `strict` | sama kui mujal repos |
| Stiil | CSS custom properties + scoped `<style>` | teegita, tokenid ühes failis |
| Animatsioon | GSAP + ScrollTrigger | scroll-driven storytelling |
| React | **ei ole** | ükski sektsioon ei vaja olekut |
| Lenis | **ei ole lisatud** | vt allpool |
| Lint | ESLint 10 + typescript-eslint + eslint-plugin-astro | `npm run lint` |

### React ja Lenis — mõlemad jäid välja

Kavand nägi ette React-saari (S2, S3). Valmis komponendid ei kasutanud
ühtegi Reacti võimalust — ei olekut ega efekte peale GSAP-i — ja
integratsioon oleks pannud buildi 58 kB (gzip) runtime'i, mida ükski leht
sisse ei loe. Integratsioon on eemaldatud; tagasi ühe käsuga, kui mõni
tulevane sektsioon seda päriselt vajab.

### Lenis — jäi välja

`scrub: 1` annab pinnitud sektsioonides piisavalt sujuva tulemuse, seega
Lenist ei lisatud. Ta võtaks üle natiivse kerimise, mis on puuteseadmes ja
`prefers-reduced-motion` puhul omaette risk, ja maksaks JS-eelarvest.
Lisa ainult siis, kui mõõdad, et ilma on konarlik.

**`eslint-plugin-jsx-a11y` ei ole paigaldatud**: see toetab ESLint 9,
`eslint-plugin-astro@3` nõuab ESLint 10, ja need kaks ei mahu korraga
sõltuvuspuusse. Astro plugin katab `.astro` failide a11y reeglid ise.

### `src/lib/gsap.ts`

Üks koht, kus pluginad registreeritakse ja globaalsed vaikeväärtused
seatakse. Iga komponent impordib siit, mitte otse `gsap`-ist — muidu
registreeritakse ScrollTrigger mitu korda ja `matchMedia` seaded lähevad
lahku.

Siin ka **globaalne `prefers-reduced-motion` lüliti**: selle korral
kõik scrub-animatsioonid asenduvad lõppseisuga, pin jääb ära.

### `src/lib/motion.ts`

Selle peale ehitatud liikumisruntime, mida sektsioonid päriselt kasutavad:
veakindel `motion()` / `when()`, üks `ScrollTrigger.refresh()` pärast fonte
ja pilte, ning jagatud liigutused (`hideLines` / `UNMASKED`, `drawX`).

Lisatud siis, kui selgus, et S4–S10 olid küll animeeritud, aga igaüks ühe
ühekordse `once: true` fade'iga — kerimine ei juhtinud neist ühtegi ja leht
tundus S4-st alates staatiline. Täpsemad reeglid: `CLAUDE.md` → "Liikumine".

---

## 3. Sektsioonid

Kümme sektsiooni, järjekord on jutustus (`CLAUDE.md` → "Peamine jutustus").

### S1 — Hero ✅ **ehitatud** (`components/sections/Hero.astro`)

**Sisu.** Täisekraan, asümmeetriline. Vasakul `TUNNID, MIS VASTAVAD
TEGELIKKUSELE.` — Sofia Sans Condensed 900 italic, kolmas rida oranž.
Alltekst, üks CTA (`ALUSTA TASUTA` + "14 päeva tasuta"). Paremal
mõõdistusjoonis (geofence'i ring, krundi kontuur, **paigalseisev** töötaja
märk ringi sees) ja selle peal päris äpi ekraan kinnitatud olekus. All
andmeriba: objekt, koordinaadid, raadius, "kontrollitud serveris".

**Timeline** (laadimisel, ilma ScrollTriggerita):
```
0.00  pealkirja read reamaskiga alt üles, stagger 0.075
0.15  geofence'i ring joonistub (strokeDashoffset), 1.4 s
0.45  seade sisse (opacity + y)
0.60  alltekst
0.90  HUD-sildid, stagger 0.09
0.95  CTA
1.05  andmeriba, stagger 0.05
```

**Otsused, mis tulid katsetamisest:**
- Pealkirja read on **jagamatud** (`white-space: nowrap`) — i18n-failis on
  need juba ridadeks murtud ja automaatne murdmine lõhkus vene keeles kuju
  (kolm rida läks neljaks).
- Telefon on **tervikuna** näha, mitte kärbitud: pool kaarti ekraani
  servas nägi välja nagu viga.
- Mõõdistusjoonisel on **radiaalne mask** — ilma selleta paistis SVG
  ristkülikuserv kõva joonena.

### S2 — Vastandus ✅ **ehitatud** (`components/react/Proof.tsx`)

Lehe kõige tugevam hetk ja **ainus React-saar**.

```
10H KIRJAS.  →  5H OBJEKTIL.  →  SEE EI OLE ENAM VÕIMALIK.
```

Riba all ei ole kaunistus, vaid sama väide mõõteriistana: täislaiuses
skaala 0–10 h, roheline 0–5 (kohalolekuga tõendatud), punane 5–10 (vahe).
Lõpus **kaob punane pool ära**, jättes alles ainult tõendatud osa.

**Timeline** (pinnitud, `scrub: 1`, desktopil `end: "+=200%"`):
```
0.00  "10H KIRJAS." sisse; neutraalne riba täitub
0.22  "5H OBJEKTIL." roheliselt; roheline segment 0 → 50 %
0.42  punane vahe-segment 50 → 100 %; silt "VAHE · 5H"
0.58  hoia (0.16) — lugejal peab olema aega vastandus omaks võtta
0.72  esimesed kaks rida taanduvad opacity 0.22
0.78  "SEE EI OLE ENAM VÕIMALIK." oranžis
0.80  punane segment scaleX → 0 (kaob, ei tuhmu)
```

Värvid järgivad äpi tähendusi: roheline = kohalolekuga tõendatud, punane =
objektilt väljas. Otsus on lehe suurim tekst — suurem kui hero pealkiri.

### S3 — Kohaloleku ahel ✅ (`sections/Chain.astro`)

Lehe peamine tootedemo. Neli sammu ÜHES kompositsioonis: sama objekt, sama
telefon, muutub olek.

```
01 SAABU        töötaja jõuab objektile        (märk väljaspool ringi)
02 KINNITATUD   asukoht kontrollitud            (märk ringi sees, roheline)
03 TÖÖTA        kell käib, kui töötaja on kohal (päris aktiivne tööpäev)
04 LAHKU        lahkud objektilt, aeg peatub    (märk väljas, punane)
```

**Desktop:** `pin: ".chain__stage"`, `end: "+=380%"`, `scrub: 1`. Iga sammu
juures ristfade tekstil ja telefonil, märk liigub uude asukohta, sammuriba
märgib edenemise.

**Märk EI joonista teekonda ega liigu pidevalt.** Liikumine toimub ainult
sammude vahel ja tähistab piiri ületamist. Toode kasutab OS-i geofencing't
ja äratatakse ainult piiri ületamisel — kaardil roomav punkt oleks nii vale
kui ka müügiargumendina kahjulik.

**Mobiil:** pinni EI ole. Neli sammu kerivad vertikaalselt, iga sammu juures
oma telefon. Telefonid on `order`-iga sammude vahele seotud (`display:
contents` üksi oleks pannud kõik neli telefoni tekstide ette) ja kärbitud
ülaossa. Samm 02 kasutab sama ekraani mis 01, seega mobiilis on see peidetud
— kaks identset pilti järjest loeks välja nagu viga.

### S4 — Halduri vaade ✅ (`sections/Admin.astro`)

`ADMIN NÄEB REAALSEID TUNDE.` → päris arvutiliidese tõmmis → `KUU LÕPP ILMA
EXCELI DETEKTIIVITÖÖTA.`

Tõmmis EI ole brauseri-kaardi sees: külgmenüü on kärbitud maha ja sisuveerg
täidab raami täpselt (`width: 138.5%`, `margin-left: -38.5%` — arvutatud
1440/1040 järgi, mitte silma järgi). Viited on **legend pildi kõrval**;
esimeses versioonis olid nad pildi peal ja katsid täpselt need read,
millele osutasid.

### S5 — Võimalused ✅ (`sections/Capabilities.astro`)

Kuus võimalust **editorial-registrina**: number, pealkiri, seletus, joon.
Mitte kaardiruudustik. Kaks päris UI detaili kadreeritakse juurde
(peatatud kell, tööliigid) — kadreering, mitte suurendus, et tekst jääks
teravaks.

### S6 — Kontroll ✅ (`sections/Trust.astro`)

`TELEFON EI OTSUSTA. SERVER KONTROLLIB.` Tõendiahel nelja lülina
(ajatempel → asukoht → kontroll serveris → kohalolekukirje) ja neli väidet.
Ei tabalukke, ei küberturbe esteetikat. Lõpus tahtlik reservatsioon: ükski
süsteem ei ole eksimatu.

### S7 — Offline ✅ (`sections/Offline.astro`)

`VÕRKU POLE? TÖÖPÄEV EI KAO.` Neli olekut jadana: ühendus kadunud →
järjekorras → saadetud → kinnitatud.

**Siin ei ole tootekaadrit.** Ühenduseta olekut ei õnnestunud päris
rakendusest usaldusväärselt jäädvustada (brauseris annab võrgu katkestamine
dev-serveri veaehe, mitte äpi enda vaate), ja plaan lubab sel juhul
tehnilist kompositsiooni võlts-UI asemel.

Sektsioon on tahtlikult MADAL — rütmis on vaja hingetõmmet.

### S8 — Arveldamine ✅ (`sections/Billing.astro`)

`KONTROLLITUD TUNNID → TÖÖLIIK → HIND → ARVE` ahelana, päris arveldusvaade
kõrval, ja kolm reeglit, mida turundusjutt kõige kergemini valesti ütleks:
hinnata töö ei ole tasuta töö, sama tund ei lähe kaks korda, arve on
hetktõmmis.

### S9 — Hind ✅ (`sections/Pricing.astro`)

Üks hind, ilma astmeteta. Number ja prooviperiood tulevad `site.config`-ist,
mis kattub API koodiga. Kolme kunstlikku tier'i ei ehitatud.

### S10 — Küsimused ja lõpp ✅ (`sections/Faq.astro`, `sections/FinalCta.astro`)

FAQ on natiivne `<details>`/`<summary>`: klaviatuurilt kasutatav, töötab
ilma JS-ita. Vastused tulevad päris toote loogikast.

Lõpp-CTA `TÖÖAEG, MIDA SAAB USALDADA.` toob mõõdistusjoonise tagasi —
jutustus lõpeb seal, kust algas.

---

## 4. Visuaalne rütm

Iga sektsioon EI ole `100svh`. Rütm vaheldub tahtlikult, muidu muutub leht
üheks pikaks ühtlaseks müraks:

| # | Iseloom | Kõrgus |
|---|---|---|
| S1 | suur, kohe | `100svh` |
| S2 | pin, aeglane | `100svh` × 3 |
| S3 | pin, jutustus | `100svh` × 4,8 |
| S4 | editorial + full-bleed pilt | loomulik |
| S5 | vaikne register | loomulik |
| S6 | tehniline, tihe | loomulik |
| S7 | **madal, hingetõmme** | loomulik, väike |
| S8 | editorial + toode | loomulik |
| S9 | vaikne, üks suur number | loomulik |
| S10 | küsimused + suur lõpp | loomulik |

## 5. Desktop vs mobiil

Pinnitud scroll-jutustus on desktopi tehnika. Mobiilis on see aeglane,
söög akut ja kipub `100vh`-i aadressiriba probleemidega katki minema.

Kõik erinevused ühes kohas: `ScrollTrigger.matchMedia` / `gsap.matchMedia`.

| Sektsioon | Desktop | Mobiil |
|---|---|---|
| S1 Hero | täisekraan, suur tüpo | sama, väiksem aste, `100svh` mitte `100vh` |
| S2 Vastandus | pin + scrub, `+=200%` | pin, aga `+=120%`, lihtsam |
| S3 Ahel | horisontaalne pin, 7 sammu | **vertikaalne**, ilma pinnita, kaardid üksteise all |
| S4 Geofence | ring + kõrvaltekst | ring üleval, tekst all |
| S5 Kell | scrub | `once: true`, mängib korra |
| S6 Admin | sticky showcase | staatiline pilt + tekst |
| S7 Arveldus | joonistuv diagramm | staatiline, lihtsustatud |
| S9 Proof | tihe tabel | kaks veergu → üks |

Üldreeglid mobiilis:
- **ei horisontaalset pinni** — puuteseadmes eksitab
- parallax välja
- `100svh`/`100dvh`, mitte `100vh`
- pilt asemel video ei tule kõne alla ilma `prefers-reduced-data` kontrollita

`prefers-reduced-motion: reduce` **mõlemas**: pin ära, scrub ära, kõik
lõppseisus. Leht peab olema täiesti loetav ka siis.

---

## 6. Jõudlus — mõõdetud

| Asi | gzip |
|---|---|
| HTML (avaleht) | 10,6 kB |
| CSS (kogu leht, üks fail) | 7,9 kB |
| GSAP + ScrollTrigger | 42,8 kB |
| Sektsiooniskriptid (13 tk) + `motion.ts` + analytics | 7,7 kB |
| **Esmane laadimine kokku** | **~68,9 kB** |
| React runtime | **0 kB** — integratsiooni ei ole |

Mõõdetud Lighthouse (production build, gzip, `scripts/serve-dist.mjs`):

| | Performance | A11y | Best Practices | SEO |
|---|---|---|---|---|
| Desktop | **100** | **100** | **100** | **100** |
| Mobiil | **96** | **100** | **100** | **100** |

Desktop LCP 0,5 s · mobiil LCP 2,6 s · CLS **0** · TBT **0 ms** mõlemas.

**Stiililehe inline'imist proovitud ja tagasi võetud.** Lighthouse lubas
renderdust blokeeriva päringu kaotamisest ~450 ms võitu; mõõdetud tulemus
oli vastupidine (FCP 1,8 → 2,0 s, Performance 96 → 95), sest inline'itud
CSS teeb iga HTML-i ~7,5 kB suuremaks. Jäi väliseks.

**Hero pilti EI eellaadita.** LCP jaotus näitas, et pilt on kohal kohe
(Load Delay 0 ms, Load Time 0 ms) ja viivitus on renderdamises — preload
ei annaks midagi. Sai `fetchpriority="high"` ja tihedama laiuseredeli.

Varasem number oli 54,6 kB. Kasv **+3,3 kB** tuli S4–S10 liikumiskihist:
enne oli igal neist üks ühekordne `gsap.from(opacity, y)`, nüüd on
kerimisega seotud ajajooned. Vt `CLAUDE.md` ptk "Liikumine".

Suurimad varad: `desktop-overview.webp` 95,7 kB, `desktop-billing.webp`
77,3 kB, `mobile-away.webp` 75,8 kB, `og.png` 67,4 kB. Kõik pildid peale
hero oma on `loading="lazy"`; hero telefon on `eager` ja display-font
`preload`-itud keele järgi.

CLS: kõigil piltidel on `astro:assets` kaudu mõõdud küljes ja
kompositsioonid kasutavad `aspect-ratio`, seega sisu ei hüppa.

## 7. Deploy — `stp.nutisemud.ee` (Cloudflare Pages)

**Otsustatud: Cloudflare Pages.** Turundusveeb jääb API VM-ist ja
olemasolevast deploy pipeline'ist täiesti eraldi.

Miks see, mitte VM: marketing-veebi deploy ei puuduta Proxmoxi VM-i,
`deploy-api-1` konteinerit ega `cloudflared`-i seadistust. Katkine build ei
saa API-t maha võtta, sest neil ei ole ühist protsessi ega ühist
konfiguratsioonifaili.

### Pages'i projekti seaded

| Väli | Väärtus |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `website` |
| Node version | 22 |

Keskkonnamuutuja (Production ja Preview):

```
PUBLIC_CTA_URL = https://api.nutisemud.ee/register
```

Ilma selleta kasutab `site.ts` sama väärtust vaikimisi, seega leht ei
lähe katki — aga aadressi muutmine nõuaks siis koodimuudatust.

### Domeen

`stp.nutisemud.ee` lisatakse Pages'i projektile custom domain'ina;
Cloudflare loob CNAME-kirje ise. **`api.nutisemud.ee` jääb puutumata** —
uus kirje, mitte muudatus olemasolevas.

### Mida EI tehta

- ei muudeta `cloudflared` tunneli konfiguratsiooni
- ei lisata konteinerit `deploy/docker-compose.*.yml`-i
- ei puudutata `api/Dockerfile`-i

## 8. Kontroll: kas olemasolev deploy jääb terveks?

Käisin selle läbi. Tulemus: **funktsionaalselt jah, ühe hoiatusega.**

| Kontroll | Tulemus |
|---|---|
| Kas `api/Dockerfile` kopeerib `website/`? | **Ei.** Kopeeritakse ainult `api/` ja `mobile/` |
| Kas `website/` läheb API image'isse? | Ei |
| Kas compose viitab `website/`-le? | Ei |
| Kas `mobile/` build puudutab `website/`-t? | Ei |
| Kas `website/` on API build-kontekstis? | **Jah — see on ainus probleem** |

### ⚠️ Leitud risk: Docker build-kontekst

`api/deploy/docker-compose.with-mysql.yml` seab `context: ../..` ehk repo
juure. Seega **kogu `website/` kaust saadetakse Docker-daemonile iga API
buildiga**, kuigi Dockerfile ei kopeeri sealt midagi.

Praegune `.dockerignore` välistab juba `**/node_modules`, `**/dist` ja
`**/build`, seega kõige suuremad tükid jäävad välja. Aga `website/public/`
— fondid, tootepildid, objektifotod — **ei jää**. Turunduslehe meedia võib
kergesti olla kümneid megabaite ja see aeglustaks iga API deployd.

**Parandatud:** repo juure `.dockerignore` faili on lisatud rida
`website`. See ei muuda API image'i sisu ega käitumist — Dockerfile ei
kopeerinud sealt niikuinii midagi — vaid hoiab turunduslehe fondid ja
pildid Docker-daemonile saatmisest välja.

Kontrolli pärast suuremaid varade lisamisi, et rida on endiselt kohal:

```bash
grep -n website .dockerignore
```

---

## 9. Seis

Kõik sammud tehtud:

| # | Samm | Seis |
|---|---|---|
| 1 | Astro projekt, tokenid, fondid | ✅ |
| 2 | `BaseLayout`, navigatsioon, jalus, HUD-komponendid | ✅ |
| 3 | S1 ja S2 | ✅ |
| 4 | Päris tootekaadrid (9 tk, korratav skript) | ✅ |
| 5 | S3–S10 | ✅ |
| 6 | Mobiili variandid | ✅ |
| 7 | `prefers-reduced-motion` kogu lehel | ✅ |
| 8 | SEO: sitemap, robots, OG, canonical, hreflang | ✅ |
| 9 | Brauseri-QA: 4 keelt × 6 laiust | ✅ |
| 10 | Ligipääsetavus: hierarhia, fookus, kontrast | ✅ |
| 11 | Deploy-dokumentatsioon | ✅ (`README.md`) |
| 12 | Deploy ise | — ootab Cloudflare Pages'i projekti loomist |

## 10. Mis on veel lahtine

- **Fondilitsentside failid** `public/fonts/` alla enne avaldamist.
  Kõik kolm on OFL, aga litsentsifail on kaasa panemata.
- **Objektifotod.** Lehel neid ei ole ja ta ei vaja neid — mõõdistusjoonis
  kannab visuaali. Kui päris objektifotod tulevad, on S1 ja S7 loomulikud
  kohad.
- **Ühenduseta oleku tootekaader** (S7). Praegu tehniline kompositsioon.
- **Värvide lõplik kinnitus.** Väärtused on `tokens.css`-is ja töötavad,
  aga neid ei ole brand book'iks kinnitatud.
- **Cloudflare Pages'i projekt** tuleb luua ja domeen siduda.
