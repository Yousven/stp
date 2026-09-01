# CLAUDE.md — website/

Juhis Claude Code'ile selles kaustas. Repo juures on oma `CLAUDE.md`, mis
kirjeldab toodet ennast — see fail käib ainult **turundusveebi** kohta.

Kõrvale: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) (struktuur,
sektsioonid, animatsioonid, deploy) ja [`ASSETS.md`](ASSETS.md) (fondid,
värvid, pildid).

## Millega see veeb tegeleb

SmartTimePlanningu avalik turundusleht aadressil **`stp.nutisemud.ee`**,
mida serveerib **Cloudflare Pages** — API VM-ist ja olemasolevast deploy
pipeline'ist täiesti eraldi.
Selle ainus ülesanne on **selgitada toodet inimesele, kes ei ole veel
klient, ja suunata ta olemasolevasse lahendusse**. Rakendus ise on mujal
(`mobile/`), andmed on API-s (`api/`).

Müügisõnum, mille ümber kogu leht käib:

> **TUNNID, MIS VASTAVAD TEGELIKKUSELE.**

Toode, mida müüme, on **kontrollitav tööaeg ehitusettevõtetele**. GPS ja
geofence on mehhanism, mitte toode — ära turunda seda kui "GPS-iga
tööajaarvestust".

## Bränd: toode ja ettevõte on ERI asjad

See on kõige kergemini rikutav asi kogu lehel.

| | Nimi | Kus tohib esineda |
|---|---|---|
| **Toode** | `SmartTimePlanning` | kogu turunduskoopia, wordmark, `<title>`, OG, structured data `name` |
| Lühend | `STP` | domeen (`stp.nutisemud.ee`), tehnilised detailid, `alternateName` |
| **Ettevõte** | `Nutisemud OÜ` | AINULT autoriõiguse rida, juriidilised lehed, structured data `provider` |

**Toodet ei nimetata kunagi "Nutisemudeks".** Nutisemud OÜ on juriidiline
isik toote taga, mitte tööajaarvestuslahenduse nimi.

Mõlemad tulevad `src/config/site.ts`-ist (`site.vendor`), mitte
komponentidest. Jaluses on üks rida, mis suhte välja ütleb —
"SmartTimePlanning on Nutisemud OÜ toode." — et keegi ei peaks arvama.

Juriidilised rekvisiidid (registrikood, KMKR, aadress, telefon, e-post)
elavad `site.legal`-is ja on **kõik `null`**. Neid EI tohi välja mõelda;
komponendid jätavad puuduvad read renderdamata. Vt `LAUNCH.md`.

## Keda see leht kõnetab

**Ehitusettevõtte omanik või juhataja.** See on KOLMAS sihtrühm ja erineb
mõlemast, kelle jaoks äpp on tehtud:

| Kus | Kes | Olukord |
|---|---|---|
| `mobile/` telefoniliides | töötaja objektil | kinnas, päike, kiirustab |
| `mobile/` arvutiliides | juhataja, raamatupidaja | kontorilaud, haldab andmeid |
| **`website/`** | **ostuotsuse tegija** | **kaalub, kas see on tema raha väärt** |

Seetõttu **ei tohi siia kopeerida äpi kujundusreegleid**. Objektiäpi 72 px
nupud ja "üks tegevus ekraani kohta" lahendavad probleemi, mida veebilehel
ei ole. Siin on vaja usaldust, tempot ja selgust.

## Tehnoloogia — otsustatud

- **Astro + TypeScript**, `output: "static"`.
- **GSAP + ScrollTrigger**, alati `src/lib/motion.ts` kaudu (mis omakorda
  ehitab `src/lib/gsap.ts` peale). Otse `gsap`-ist importides
  registreeritaks plugin mitu korda ja `matchMedia` seaded läheksid
  sektsioonide vahel lahku. Vt ptk "Liikumine".
- **React-integratsiooni EI OLE.** Kavand nägi ette React-saari, aga ükski
  valmis sektsioon ei vaja Reacti võimalusi — kõik on Astro markup + GSAP,
  mis juhib DOM-i. Kasutamata integratsioon oleks pannud buildi 58 kB
  (gzip) React-i runtime'i, mida ükski leht sisse ei loe.
  Kui mõni tulevane sektsioon vajab päriselt olekut: `npx astro add react`,
  ja siis `@gsap/react` (`useGSAP`) ainult selles komponendis.
- **Lenis ei ole lisatud.** ScrollTrigger `scrub: 1` annab pinnitud
  sektsioonides sama tulemuse; Lenis võtaks üle natiivse kerimise, mis on
  puuteseadmes ja `prefers-reduced-motion` puhul omaette risk.

**Sellest ei tehta SPA-d.** SEO, laadimiskiirus ja võimalikult vähene JS on
tähtsamad kui `mobile/` stackiga identsus. Esmane laadimine on **~69 kB
gzip** (HTML 10,6 + CSS 7,9 + GSAP 42,8 + sektsiooniskriptid 7,7).

Mõõdetud Lighthouse: desktop **100/100/100/100**, mobiil
**96/100/100/100**.

### Fondid

Kõik **self-hostitud** (`public/fonts/`), ilma Google Fontsi või muu
välise CDN-ita. Neli subsetti: latin, latin-ext, cyrillic, cyrillic-ext.

| Roll | Font |
|---|---|
| Display | **Sofia Sans Condensed Variable**, 900, italic |
| Tekst | **Geist Variable** |
| Tehniline / HUD | **Geist Mono Variable** |

Kirillitsa katvus on kõigil kolmel **kontrollitud** (fontsource'i
subset-failid olemas), seega display-font on kõigis neljas keeles sama —
kirillitsale eraldi tagavarafonti EI ole.

Eesti `š` ja `ž` elavad **latin-ext'is**, ukraina `ї є ґ`
**cyrillic-ext'is** — kumbagi ei tohi subsettide hulgast välja jätta.

## Mis on ehitatud

**Kogu leht S1–S10 on valmis.** Alus, navigatsioon, jalus, neli keelt,
SEO, OG-pilt, sitemap.

| # | Sektsioon | Fail |
|---|---|---|
| S1 | Hero | `sections/Hero.astro` |
| S2 | Vastandus 10h / 5h | `sections/ProofSection.astro` |
| S3 | Kohaloleku ahel (pinnitud, 4 sammu) | `sections/Chain.astro` |
| S4 | Halduri vaade | `sections/Admin.astro` |
| S5 | Võimalused (register, mitte kaardid) | `sections/Capabilities.astro` |
| S6 | Kontroll ja tõendiahel | `sections/Trust.astro` |
| S7 | Offline | `sections/Offline.astro` |
| S8 | Arveldamine | `sections/Billing.astro` |
| S9 | Hind | `sections/Pricing.astro` |
| S10 | Küsimused + lõpp-CTA | `sections/Faq.astro`, `sections/FinalCta.astro` |

Lisaks avalehele:

| Leht | Tee | Märkus |
|---|---|---|
| 404 | `/404.html` | ainult lähtekeeles — Pages serveerib ühte faili |
| Privaatsus | `/privacy/` | **sisu kinnitamata**, `noindex` |
| Tingimused | `/terms/` | **sisu kinnitamata**, `noindex` |
| Kontakt | `/contact/` | **andmed puuduvad**, `noindex` |

Juriidilised lehed on olemas selleks, et jaluse lingid ei viiks 404-le, ja
nad ütlevad ise välja, et tekst on kinnitamata. Väljamõeldud tingimusi ei
avaldata.

Käivitamine ja deploy: [`README.md`](README.md).
Avaldamise blokeerijad ja Cloudflare'i sammud: [`LAUNCH.md`](LAUNCH.md).

## Liikumine

Kogu leht on **kerimisjuhitud**. See ei ole kaunistus: leht jutustab ahelat
(töötaja saabub → aeg käib → lahkub → aeg peatub → admin näeb → arve) ja
kerimine ON selle jutustuse aeg.

### Kaks reeglit, mille rikkumine ei paista buildist välja

**1. Algseisu seab AINULT JS, lõppseisu ainult CSS.** Iga `gsap.set(...)`,
mis midagi peidab, elab `when(...)`-ploki sees. Nii on sektsioon täiesti
loetav nii `prefers-reduced-motion` korral kui ka siis, kui JS ei jookse.
Kui peidad midagi CSS-is ja näitad JS-iga, on leht mõlemal juhul katki.

**2. Iga `scrub` peab kerimise lõpuks lõpuni jõudma.** Kui trigger'i `end`
jääb lehe kerimisulatusest välja (tüüpiliselt viimases sektsioonis), jääb
sisu igaveseks poolläbipaistvaks. Seda ei näita ei build ega tüübikontroll
— seda valvab `scripts/qa.mjs` kontroll "lõppseis".

### Struktuur

`src/lib/motion.ts` annab igale sektsioonile kolm asja:

- **veakindlus** — `motion()` ja `when()` on try/catch sees, seega üks
  katkine sektsioon ei võta järgmisi maha (varem oleks võtnud);
- **refresh** — üks `ScrollTrigger.refresh()` pärast fonte ja `load`-i,
  sest laisalt laetud pilt ja fondivahetus muudavad kõrgusi;
- **ühine keel** — `hideLines`/`UNMASKED` (tekst maski alt) ja `drawX`
  (joone tõmbamine). Terve leht koosneb neist kahest liigutusest.

Sektsioon kirjutab:

```ts
motion("nimi", ".juur", ({ q, all, when }) => {
  when({ wide: DESKTOP, narrow: NARROW }, (self) => {
    const wide = !!self.conditions?.wide;
    // algseisud + ajajooned; tagasta koristus
  });
});
```

### Tempo

Kõigil sektsioonidel EI ole sama animatsioon — see oli varasem viga, mille
tõttu leht tundus S4-st alates staatiline. Tajutav intensiivsus:

| S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 |
|---|---|---|---|---|---|---|---|---|---|
| 90 % | 100 % | 100 % | 80 % | 50 % | 80 % | **30 %** | 70 % | 50 % | 70 % |

S7 madalus on tahtlik: pärast S6 tehnilist jada on rütmis vaja hingetõmmet.
**Pin on ainult S2-l ja S3-l** — kolmas pinnitud sektsioon muudaks lehe
kerimise võitluseks.

## Turvapäised ja CSP

`_headers` **genereeritakse buildi ajal** (`scripts/build-headers.mjs`),
mitte ei hoita käsitsi. Põhjus: Astro paneb lühikesed skriptid HTML-i
sisse ja range CSP nõuab siis nende SHA-256 räsi — käsitsi hoitud fail
läheks esimese koodimuudatusega vaikselt katki.

CSP-s **ei ole** `unsafe-inline` ega `unsafe-eval`. GSAP ei vaja neid.

Kui lisad millegi VÄLISE (analytics, font, pilt, API), tuleb tema domeen
lisada õigesse direktiivi — muidu blokeeritakse ta vaikselt. Kontrolli
alati päris päistega:

```bash
npm run build && node scripts/serve-dist.mjs
SITE_URL=http://localhost:4330 node scripts/qa.mjs
```

`astro preview` **ei rakenda `_headers`-it**, seega CSP-d sellega
kontrollida ei saa.

`Permissions-Policy` keelab muu hulgas `geolocation` — **toode** kasutab
asukohta, turundusleht mitte, ja seda on aus ka brauserile öelda.

## Analytics

`src/lib/analytics.ts` on provider-agnostiline sündmuste kiht ja
`components/ui/Analytics.astro` ühendab ta DOM-iga. **Providerit ei ole
valitud** — leht ei tee ühtegi võrgupäringut ja töötab ilma vigadeta.

Sündmused: `cta_click`, `pricing_view`, `faq_open`, `language_change`,
`scroll_50`, `scroll_90`. **PII-d ei saadeta** — ainult sündmuse nimi ja
paar kitsast välja (asukoht lehel, keelekood, FAQ järjekorranumber).

## Mida see veeb EI tee

Need on kõvad piirid, mitte soovitused.

- **Ei registreerimist, ei sisselogimist, ei autentimist.** Kasutaja
  luuakse olemasolevas lahenduses (äpis või olemasolevas veebiliideses).
  Turundusleht suunab sinna, ei dubleeri seda.
- **Ei planeerita `app.stp.nutisemud.ee` aadressi** ega muud eraldi
  rakenduse-hosti.
- **Ei muudeta `api/`, `mobile/` ega olemasolevat deployd.** Kui tundub, et
  mõni muudatus seal on vajalik, küsi enne.
- **Ei kuvata andmeid.** See ei ole teine liides samale andmebaasile.

## Demoandmed

Kõik lehel nähtavad andmed on **neutraalsed väljamõeldud demoandmed**.
Päris kliendi ega päris objekti nimesid ega aadresse siia ei panda —
ei ekraanipiltidele, ei HUD-i, ei koopiasse, ei seemnesse.

Kasutuses: objektid **Riia 24**, **Kesklinna objekt**, **Laohoone**;
töötajad **Mart Tamm**, **Kristjan Lepik**, **Priit Saar**; tellija
**Tellija AS**. Vt `scripts/demo-seed.mjs`.

## Mida EI tohi kujutada

Leht ei tohi lubada asju, mida toode ei tee. Vale pilt on halvem kui puuduv.

- **Ei pidevat GPS-jälgimist.** Rakendus kasutab teadlikult OS-i
  geofencing't: telefon äratatakse ainult piiri ületamisel. Kaardil liikuv
  punkt või "jälgi töötajat reaalajas" on vale ja ka müügiargumendina
  kahjulik — see teeb tootest jälgimisseadme.
- **Ei tööpäeva alustamist/lõpetamist arvutist.** See on äpis teadlikult
  välja lülitatud, sest arvutis ei ole asukohta millegagi tõendada.
- **Ei väljamõeldud funktsionaalsust.** Kui seda repos ei ole, ei ole seda
  ka lehel. Kahtluse korral kontrolli koodist.

## Peamine jutustus

Lehe selgroog on ahel, mitte funktsioonide nimekiri:

```
töötaja saabub objektile
  → asukoht kinnitatakse
    → tööaeg käib
      → töötaja lahkub objektist
        → aeg peatub
          → admin näeb kontrollitud tunde
            → tunnid liiguvad arveldamisse
```

Üks keskseid sektsioone kannab seda vastandust:

```
10H KIRJAS.
5H OBJEKTIL.
        scroll ↓
SEE EI OLE ENAM VÕIMALIK.
```

## Visuaalne suund

Referents: **https://www.intvl.com.au/** — võta sealt *lähenemine*, mitte
bränd ega konkreetne kujundus.

Mida referentsist võtta:

- väga suur editorial-tüpograafia
- täisekraani sektsioonid
- scroll-driven storytelling
- sticky/pinned product showcase
- **päris toote UI kujunduse osana** (mitte joonistatud mockup'id)
- HUD/tehnilised detailid — koordinaadid, raadiused, ajatemplid, olekusildid
- kihilised kompositsioonid
- tugev visuaalne tempo
- **minimaalselt traditsioonilisi SaaS-card'e**

### Meie oma identiteet — ehitusvaldkond

Värvid ja fondid on `ASSETS.md`-s täpsete väärtustena. Tähendus:

| Roll | Värv |
|---|---|
| Alus | asphalt black |
| Pind / tekst | concrete / off-white |
| **Põhivärv** | **signal / construction orange** |
| Töötab, kinnitatud olek | roheline — **ainult selleks** |
| Objektilt väljas, peatatud, viga | punane — **ainult selleks** |

Roheline ja punane on **olekuvärvid, mitte kaunistus**. Sama reegel kehtib
äpis (roheline = kell käib, punane = objektilt väljas) ja veeb ei tohi seda
lahjendada — kui sama värv tähendab lehel korra "õnnestumist" ja korra
"kohalolekut", kaob mõlemal tähendus.

Fondid on ptk "Tehnoloogia — otsustatud" all. Display on **alati** raske ja
kaldu — see on identiteet, mitte rõhutus, ja seda ei "pehmendata" kergema
kaaluga.

## Faktid, mida veeb väidab

Need on koodist, mitte turundusjutust. **Kui muudad neid koodis, muuda ka
siin ja lehel.** Kõik peavad tulema `src/config/site.ts`-st, mitte olema
komponentides laiali.

- **Prooviperiood 14 päeva** (`api/src/billing/subscription.ts`, `TRIAL_DAYS`)
- **5 € kasutaja kohta kuus** (`api/src/env.ts`, `PRICE_PER_SEAT_EUR`, vaikeväärtus)
- **Neli keelt**: eesti, inglise, vene, ukraina
- **iOS, Android ja arvutiliides brauseris** samast koodibaasist
- **Asukohakontroll on serveris**, mitte äpis — äpi muutmine ei aita
- **Kohalolek on ENTER/EXIT sündmuste ahel**, tunnid on nende intervallide summa
- **Admini käsitsi muudatus nõuab põhjendust** ja läheb audit-logisse

Arendaja: **Nutisemud**.

## Konfiguratsioon, mitte hardcode

Domeen, CTA sihtkoht, hind ja prooviperiood elavad ühes kohas:
`src/config/site.ts`. Komponendid loevad sealt, mitte ei hardcode'i.

CTA aadress tuleb keskkonnamuutujast **`PUBLIC_CTA_URL`** (vt
`.env.example`), vaikimisi olemasolev registreerumisleht
`https://api.nutisemud.ee/register`. Nii saab aadressi Cloudflare Pages'i
seadetes muuta ilma koodi puutumata.

## Neli keelt

**Kõik neli keelt on kohe arhitektuuris**: ET, EN, RU, UK. Eesti on
lähtekeel ja elab juurpolgul, ülejäänud saavad prefiksi (`/ru/`).

Turunduskoopiat **ei kirjutata komponentidesse**. Kui tekst on ekraanil, on
ta `src/i18n/{et,en,ru,uk}.ts`-s. Teised keeled on typitud eesti järgi
(`Messages = typeof et`), seega puuduv võti on kompileerimisviga — sama
reegel mis äpis.

Vene ja ukraina tekst on **pikem** kui eesti oma. Pealkirjad on i18n-failis
juba ridadeks murtud (`headline: string[]`) ja iga rida on CSS-is
`white-space: nowrap` — automaatne murdmine lõhuks kuju. Uut keelt või uut
pealkirja lisades **kontrolli ülevoolu**:

```bash
npm run dev
node scripts/qa.mjs             # ET/EN/RU/UK, desktop + mobiil
```

## Seos ülejäänud repoga

`website/` on **iseseisev**: ei impordi `mobile/`-ist ega `api/`-st, ei lähe
API Docker-image'i sisse ja tal on oma deploy.

Kaks nimede lõksu:

1. `api/Dockerfile` kopeerib `mobile/dist` image'isse kausta nimega **`web`**
   — see on arvutiliides, mitte see leht. Siinne kaust on `website/`.
2. API Docker-buildi kontekst on **repo juur** (`context: ../..`). Seega
   `website/` satub konteksti, kuigi Dockerfile seda kunagi ei kopeeri.
   Vt `IMPLEMENTATION_PLAN.md` peatükki deploy-isolatsiooni kohta.
