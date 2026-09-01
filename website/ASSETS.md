# Varad — website/

Fondid, värvid, pildid. Fondid, üheksa tootekaadrit, favicon ja OG-pilt on
**olemas**. Puudu on ainult fondilitsentside failid. Iga jaotis ütleb oma
seisu.

**Demoandmete reegel:** kõik nähtav on neutraalne väljamõeldud demoandmestik.
Päris kliendi ega päris objekti nimesid ega aadresse siia ei panda.

---

## 1. Värvid

Ehitusvaldkonna palett, mitte SaaS-palett. Väärtused on `tokens.css`-is
**rakendatud**, aga need ei ole veel brand book: tähendus on lukus, hex
häälestatav.

### Alus

| Roll | Nimi | Ettepanek | Kus |
|---|---|---|---|
| Taust | asphalt black | `#0B0B0D` | lehe alus |
| Taust, tõstetud | asphalt raised | `#141417` | kihid, raamid |
| Pind / tekst | concrete | `#EDEAE3` | põhitekst, suur tüpo |
| Tekst, tuhm | concrete muted | `#97938B` | kõrvaltekst, HUD |
| Joon | hairline | `#26262B` | raamid, tabelijooned |

Concrete on **soe off-white**, mitte puhas valge — puhas `#FFFFFF`
asfaldimustal on liiga terav ja kaotab ehitusliku tunde.

### Põhivärv

| Roll | Nimi | Ettepanek |
|---|---|---|
| **Aktsent** | **signal orange** | **`#FF5A00`** |
| Aktsent, tuhm | signal dim | `#B33F00` |

Oranž on **põhivärv**, mitte rõhuvärv: CTA-d, võtmesõnad, joonistuvad
diagrammid, "SEE EI OLE ENAM VÕIMALIK".

### Olekuvärvid — ainult oleku jaoks

| Roll | Ettepanek | Tähendus | Äpi vaste |
|---|---|---|---|
| Roheline | `#35C46F` | töötab, kinnitatud | `--success` |
| Punane | `#FF4457` | objektilt väljas, peatatud, viga | `--danger` |

Need **ei ole kaunistus**. Äpis tähendab roheline "kell käib" ja punane
"objektilt eemal" — kui veeb kasutab sama rohelist ka "õnnestumise" või
"eelise" tähenduses, kaob mõlemal tähendus. Vt `CLAUDE.md`.

Äpi enda väärtused (`mobile/src/index.css`) on heledal taustal
(`#1f8a4c`, `#c62b45`) ja asfaldimustal ei anna piisavat kontrasti, seega
siin on tumeda tausta variandid. **Tähendus on sama, väärtus mitte.**

### Kontrast

Kontrollida enne avaldamist: kogu tekst **WCAG AA** (4.5:1, suur tekst
3:1). Sama nõue mis äpis, ja samal põhjusel — seda vaadatakse ka
päikese käes telefonist.

---

## 2. Fondid — **paigaldatud**

Kõik **self-hostitud** `public/fonts/` all. Ei Google Fontsi CDN-i: üks
päring vähem, ei kolmanda osapoole jälgimist, ja leht peab töötama ka
kehva levi korral.

| Roll | Font | Kaal | Allikas |
|---|---|---|---|
| Display | **Sofia Sans Condensed Variable** | 900, italic | `@fontsource-variable/sofia-sans-condensed` |
| Tekst | **Geist Variable** | 100–900 | `@fontsource-variable/geist` |
| Tehniline / HUD | **Geist Mono Variable** | 100–900 | `@fontsource-variable/geist-mono` |

Kõik kolm on variable-fondid: üks fail katab terve kaalude vahemiku, seega
display 900 ei maksa eraldi allalaadimist.

### Kirillitsa katvus — kontrollitud

Barlow Condensed jäi **välja** kirillitsa puudumise tõttu. Sofia Sans
Condensed asendab selle ja on kõigis neljas keeles **sama** display-font —
kirillitsale eraldi tagavara ei ole.

Kontroll ei käinud dokumentatsiooni järgi, vaid failide järgi. Kõigil
kolmel on päris subset-failid olemas:

```bash
ls node_modules/@fontsource-variable/geist-mono/files/ | grep cyrillic
```

Neli subsetti kopeeritakse `public/fonts/` alla (16 faili, ~330 kB kokku):

| Subset | Miks |
|---|---|
| `latin` | põhi |
| `latin-ext` | **eesti `š` ja `ž` on siin**, mitte latin'is |
| `cyrillic` | vene |
| `cyrillic-ext` | **ukraina `ї є ґ` on siin** |

Ühegi väljajätmine tähendaks, et pealkiri langeb ühe tähe pärast
tagavarafondile.

### Laadimine

- `woff2`, `font-display: swap`, `unicode-range` subsettide kaupa
- `preload` **ainult** display-fondile ja **keele järgi**: kirillitsa lehel
  laetakse ette cyrillic-fail, mitte latin (vt `BaseLayout.astro`)
- Geist ja Geist Mono ilma preloadita — need on allpool
- tagavarastack kõigile kolmele (`tokens.css`)

### Litsentsid — **lahtine**

Kõik kolm on avatud litsentsiga (OFL), aga **litsentsifailid ei ole veel
`public/fonts/` alla pandud**. Enne avaldamist tuleb need lisada. Litsentsi
väide, mida keegi kontrollinud ei ole, ei ole litsents. Vt `LAUNCH.md`.

### Vahemälu — fondi vahetamisel tuleb faili UMBER NIMETADA

`_headers` annab `/fonts/*`-ile `max-age=31536000, immutable`. Failinimed
EI ole sisu järgi räsitud (`sofia-sans-condensed-latin-wght-italic.woff2`),
seega kui fonti kunagi vahetada sama nime all, hoiab juba käinud kasutaja
brauser vana faili **aasta aega**.

Reegel: **uus fondifail = uus failinimi.** Näiteks lisa versioon nime
sisse. Muidu paistab vahetus arendajale, aga mitte kasutajale.

## 3. Toote UI — päris, mitte joonistatud

Referentsi tugevaim võte on **päris toote UI kujunduse osana**. Need pildid
tulevad päris rakendusest demoandmetega — **joonistatud ega genereeritud
UI-d ei kasutata**, ka mitte ajutiselt.

### Kuidas neid teha

Käsitsi klõpsimine ei ole korratav, seega on selleks skript:

```bash
node scripts/capture-app-ui.mjs
```

Eeldab, et jooksevad API demoandmetega ja mobiili dev-server, mis sellele
API-le osutab. Skript logib sisse, ootab andmete kohalejõudmist ja
salvestab tõmmise `src/assets/app/` alla (`astro:assets` optimeerib selle
WebP-ks buildis).

**Kasuta eraldi andmebaasi**, mitte oma tavalist dev-baasi — skeemi
uuendamine võib vana baasi andmed kustutada:

```bash
docker exec <mysql> mysql -uroot -p<pw> -e "CREATE DATABASE stp_shots;"
DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_shots" npx prisma db push
DATABASE_URL="mysql://app:devpassword@localhost:3306/stp_shots" npm run prisma:seed
```

Geofence: seed loob objekti 100 km raadiusega, seega tööpäeva saab
alustada ka ligikaudse koordinaadiga. Realistlikuma pildi jaoks tasub
objektil neutraalne demonimi ja usutav raadius (nt Riia 24, 120 m).
PÄRIS kliendi või päris objekti nimesid siia ei panda.

### Seis — kõik olemas

| Fail | Mida näitab | Kus kasutusel |
|---|---|---|
| `mobile-active.png` | tööpäev käib, kohalolek kinnitatud | S1, S3 |
| `mobile-away.png` | **objektilt eemal, kell peatatud** | S3, S5 |
| `mobile-start.png` | tööpäeva alustamine, objekti valik | S3 |
| `mobile-history.png` | tööajalugu nädalate kaupa | varuks |
| `desktop-overview.png` | **kes on tööl — üks objektil, üks eemal** | S4 |
| `desktop-billing.png` | arveldus: tellija → objekt → hind | S8 |
| `desktop-worktypes.png` | tööliigid ja vaikehinnad | S5 |
| `desktop-invoice.png` | arved | varuks |
| `desktop-reports.png` | raportid | varuks |

Kaks tähtsaimat on `mobile-away` ja `desktop-overview`: need näitavad
täpselt seda, mida müüme — aeg peatub, admin näeb tõendit.

### Kellaajad tõmmistel

Lahtised tööpäevad on seemnes ankurdatud **päris ajale**, sest server
arvutab lahtise päeva 12-tunnise piiri päris ajast. Fikseeritud "eile kell
08:00" oleks pannud serveri päeva unustatuks märkima ja ekraanile ilmuks
punane hoiatus — pilt ja server räägiksid vastu.

Selleks, et öösel tehtud tõmmistel ei oleks "Alates 23:18", renderdab
`capture-app-ui.mjs` pildid ajavööndis, kus needsamad hetked loevad
tavalise tööpäevana (`workdayTimezone()`). **Andmeid ei võltsita** —
instantsid, kestused ja olekud on täpselt need, mille server välja andis.
Tööajal jooksutades on nihe niikuinii ligi null.

`created_offline` lipp nullitakse demo-andmebaasis pärast seemet: see tekib
`occurredAt` kasutamisest seemnes, mitte toote tavakäitumisest, ja
"Järelsaadetud" märge mõlema töötaja juures oleks eksitav.

### Reeglid

- **numbrid peavad olema loogilised** — 22-tunnist tööpäeva ei tohi
  pildile jääda, see on just see viga, mille toode lahendab
- nimed ja objektid võivad olla väljamõeldud, andmed mitte
- raam on õhuke joon, mitte läikiv 3D-mockup

---

## 4. Ikoonid

Äpil on oma ikoonid ilma teegita (`mobile/src/components/Icon.tsx`,
paarkümmend SVG-teed).

**Veeb ei impordi `mobile/`-ist** (vt `CLAUDE.md`), seega vajalikud teed
kopeeritakse üle `website/src/components/hud/`. Kopeeri ainult need, mida
päriselt kasutad — mitte kogu fail.

Ikooniteeki ei lisata.

---

## 5. Fotod

**Lehel ei ole ühtegi fotot ja ta ei vaja neid.** Mõõdistusjoonis
(`hud/SitePlan.astro`) kannab visuaali ise ja on ausam kui lavastatud
stock — me ei teeskle satelliidipilti.

Kui päris objektifotod kunagi tulevad, on loomulikud kohad S1 taust ja S7.

| Vajadus | Sektsioon | Seis |
|---|---|---|
| Ehitusobjekt, päris, Eesti | S1 taust | ei blokeeri |
| Töötaja telefoniga objektil | S7 | ei blokeeri |

### Lahtine küsimus

Kas on olemas **päris pilte tellija objektidelt** (loaga), või tuleb
stock? Päris pildid on selles valdkonnas märgatavalt usutavamad —
stock-ehitusfotod on tuntavalt lavastatud ja ostja tunneb selle ära.

Kui stock: eelista Eesti/Põhjamaade ilmet, väldi kiivriga naeratavaid
inimesi valge tausta ees.

**Inimeste pildid nõuavad luba.** Kui tellija objektil on pildil
tuvastatavaid töötajaid, on vaja nende nõusolekut.

---

## 6. Meta ja ikoonid

| Vara | Seis |
|---|---|
| `favicon.svg` | **olemas** — oranž ruut asfaldil, sama märk mis navis |
| `og.png` (1200×630) | **olemas** — `node scripts/og-image.mjs` |
| `robots.txt` | **olemas** |
| `sitemap-index.xml` | **olemas** — genereeritakse buildis |
| Apple touch icon | puudub (SVG-favicon katab tänapäevased brauserid) |

OG-pilt genereeritakse skriptiga lehe enda fontide ja värvidega, mitte
käsitsi joonistades — nii ei jää vana versioon jagamislinkidesse rippuma,
kui sõnum muutub. Käivita uuesti, kui pealkiri või värv muutub.

---

## 7. Kokkuvõte: mis on olemas, mis puudu

**Olemas:** fondifailid (16 woff2, neli subsetti), värvitokenid, favicon,
OG-pilt, robots.txt, sitemap, üheksa päris tootekaadrit ja korratavad
skriptid nende uuestitegemiseks.

**Ainus puuduv vara:** fondilitsentside failid `public/fonts/` alla.
Kõik kolm fonti on OFL, aga litsentsifail on kaasa panemata — see tuleb
teha enne avaldamist.

**Ainus teadlik asendus:** S7 (offline) on tehniline kompositsioon, mitte
tootekaader. Päris ühenduseta vaadet ei õnnestunud brauseris
usaldusväärselt jäädvustada. Kui see kunagi õnnestub, on koht olemas.

**Vaja otsustada:** värvide lõplik kinnitus (väärtused töötavad, aga ei ole
brand book'iks kinnitatud).
