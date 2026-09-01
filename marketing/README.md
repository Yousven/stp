# marketing/

Sotsiaalmeedia reklaamimaterjalid SmartTimePlanningule.

**Pildid genereeritakse skriptiga**, mitte ei tehta käsitsi:

```bash
cd website && node scripts/social-ads.mjs
```

Skript kasutab turunduslehe fonte, värve ja **päris tootekaadreid** — sama
reegel mis lehel, joonistatud UI-d siin ei ole. Kui sõnum või hind muutub,
tuleb kogu komplekt uuesti ühe käsuga ja vana versioon ei jää Facebooki
ringlema.

**Kaks komplekti, kaks eri tööd:**

| Kaust | Skript | Millest räägib |
|---|---|---|
| `marketing/social/` | `website/scripts/social-ads.mjs` | **Probleemist ja tulemusest.** Sõnumit kannab tüpograafia, tootekaader on tõend. Külmale sihtrühmale. |
| `marketing/app/` | `website/scripts/app-ads.mjs` | **Äpist endast.** Peaosas on telefon ja slaidid järgivad päris kasutusvoogu. Karussellina või poe-kaadritena. |

| Mõõt | Fail | Kuhu |
|---|---|---|
| 1080 × 1350 | `*-feed.png` | Facebook / Instagram sööde, karussell |
| 1080 × 1920 | `*-story.png` | Stories, Reels |
| 1290 × 2796 | `*-store.png` | App Store / Play (ainult `app/`) |

---

## Keda me kõnetame

**Ehitusettevõtte omanik või juhataja** — mitte töötaja objektil. Tema
küsimus ei ole "kuidas ma tööpäeva alustan", vaid **"kas ma saan nendele
tundidele toetuda"**.

Seetõttu räägivad reklaamid rahast, kontrollist ja kuu lõpust, mitte
nuppudest ja funktsioonide nimekirjast.

---

## 1. Vastuolu — `01-vastuolu`

Kõige tugevam konks. Kasuta esimesena, kui testid ühte kuulutust.

> **10 h kirjas. 5 h objektil.**

**Põhitekst:**

> Kui tunnid pannakse kirja mälu järgi, on vahe alati kellegi kahjuks.
>
> SmartTimePlanning seob tööaja objektil viibimisega: tööpäev algab
> objektil ja kohaloleku kinnitab server, mitte telefon. Kuu lõpus ei ole
> vaja kellegi mälule toetuda.
>
> Ehitusettevõtetele. 14 päeva tasuta.

**Pealkiri:** Tunnid, mis vastavad tegelikkusele
**Kirjeldus:** Tööajaarvestus ehitusettevõtetele · 5 € kasutaja/kuu

---

## 2. Kell peatub ise — `02-kell-peatub`

Kõige konkreetsem. Näitab päris äppi päris olekus.

> **Lahkub objektilt. Kell peatub.**

**Põhitekst:**

> Töötaja sõidab objektilt ära. Keegi ei pea midagi vajutama ega meeles
> pidama — tööaja arvestus peatub ise ja jätkub siis, kui ta tagasi jõuab.
>
> Objektilt lahkumine peatab kella, aga ei lõpeta tööpäeva. Nii ei kao
> ühtegi tundi ära ja ühtegi ei teki juurde.
>
> 14 päeva tasuta, ilma kaardita.

**Pealkiri:** Tööaeg, mis järgib objektil oldud aega
**Kirjeldus:** Töötab ka siis, kui levi ei ole

---

## 3. Kes on praegu objektil — `03-haldur`

Juhatajale. Näitab päris halduri vaadet.

> **Kes on praegu objektil?**

**Põhitekst:**

> Üks vaade näitab, kes on praegu tööl, millisel objektil ja kui kaua.
> Kes on objektilt lahkunud, on kohe näha — koos kellaajaga.
>
> Ei ole vaja helistada ega küsida. Ja kuu lõpus ei ole vaja usaldada
> mälu, sest tundide taga on kohaloleku kirjed.
>
> Ehitusettevõtetele, alates 5 € kasutaja kohta kuus.

**Pealkiri:** Näed kohe, kes on objektil
**Kirjeldus:** 14 päeva tasuta

---

## 4. Kuu lõpp — `04-kuu-lopp`

Raamatupidamise valu. Hea teine kuulutus pärast konksu.

> **Kuu lõpp ilma Exceli detektiivitööta.**

**Põhitekst:**

> Kui palju aega kulub kuu lõpus selle väljaselgitamisele, kes kus ja kui
> kaua töötas?
>
> Tunnid on juba koos. Palgaarvestus ja kliendiarve tulevad samast
> andmestikust, seega sama tundi ei arvestata kaks korda ega jäeta
> arvelt välja.
>
> Proovi 14 päeva tasuta.

**Pealkiri:** Tunnid on juba koos
**Kirjeldus:** Palgaarvestus ja arveldus samast kohast

---

## 5. Hind — `05-hind`

Retargeting: neile, kes lehte juba vaatasid.

> **5 € kasutaja / kuu**

**Põhitekst:**

> Üks hind, ilma astmeteta ja ilma seadistustasuta. 5 € kasutaja kohta
> kuus, esimesed 14 päeva tasuta.
>
> iOS, Android ja arvutiliides brauseris. Neli keelt: eesti, inglise,
> vene, ukraina.

**Pealkiri:** 5 € kasutaja kohta kuus
**Kirjeldus:** 14 päeva tasuta, ilma kaardita

---

## Sihtimine

- **Asukoht:** Eesti
- **Vanus:** 30–60
- **Huvid / töökoht:** ehitus, ehitusettevõtted, projektijuhtimine,
  väikeettevõtte juhtimine
- **Ametinimetused:** juhataja, omanik, projektijuht, objektijuht

Vene keel on paljude ehitustöötajate emakeel, aga **ostuotsuse teeb
tavaliselt eestikeelne juhataja** — seega alusta eesti keelest. Kui vene-
või ukrainakeelset sihtrühma testida, on äpp niikuinii neljas keeles ja
seda tasub kuulutuses mainida.

---

## Mida EI tohi kirjutada

Need ei ole soovitused. Vale lubadus toob kliendi, kes esimese nädalaga
pettub, ja ühe halva arvustuse.

- **Ei "GPS-jälgimine".** Me ei müü jälgimisseadet. Rakendus kasutab
  teadlikult OS-i geofencing't ja äratatakse ainult objekti piiri
  ületamisel — töötajat ei jälgita pidevalt ja nii ei tohi ka kuulutuses
  paista.
- **Ei absoluutseid väiteid.** Mitte "petmine muutub võimatuks", vaid
  "tundide taga on kontrollitav jälg". Kui keegi annab oma telefoni
  kolleegile, ei tuvasta seda ükski asukohapõhine süsteem — ja seda ei
  tohi lubada.
- **Ei väljamõeldud funktsioone.** Kui seda rakenduses ei ole, ei ole seda
  ka kuulutuses.
- **Ei tööpäeva alustamist arvutist.** See on äpis teadlikult välja
  lülitatud, sest arvutis ei ole asukohta millegagi tõendada.
- **Toode on `SmartTimePlanning`.** `Nutisemud OÜ` on ettevõte selle taga
  ja esineb ainult juriidilises kontekstis — toodet ei nimetata kunagi
  "Nutisemudeks".

## Faktid, mida tohib väita

Kõik on koodist kontrollitud (vt `website/CLAUDE.md`):

- 5 € kasutaja kohta kuus, 14 päeva tasuta
- iOS, Android, arvutiliides brauseris
- neli keelt: eesti, inglise, vene, ukraina
- asukohakontroll on serveris, mitte äpis
- kohalolek on saabumiste ja lahkumiste ahel
- töötab ka ilma võrguta, aeg salvestub telefoni
- halduri käsitsi parandus nõuab põhjendust ja jätab jälje

---

# Äpi komplekt — `marketing/app/`

Viis slaidi, mis järgivad **päris kasutusvoogu**: saabud objektile → kell
käib → lahkud → kell peatub → tunnid on kirjas. Iga slaid näitab täpselt
seda ekraani, kus see samm juhtub.

Mõeldud eelkõige **karussellina** (Facebook / Instagram), kus inimene
kerib slaidilt slaidile ja saab voost aru ilma ühtegi sõna lugemata.
Poe-mõõt (1290 × 2796) on olemas selleks ajaks, kui äpp poodi läheb.

| Slaid | Ekraan | Ütleb |
|---|---|---|
| `01-alusta` | Alusta tööpäeva | Asukoht kontrollitakse enne alustamist |
| `02-kell-kaib` | Tööpäev käib | Tunnid koguvad ainult objektil |
| `03-kell-peatub` | Objektilt eemal | Lahkumine peatab kella ise |
| `04-tunnid-kirjas` | Tööajalugu | Iga päev koos objekti ja tundidega |
| `05-proovi` | — | Hind ja CTA |

## Karusselli põhitekst

> **Nii see töötab.**
>
> Töötaja jõuab objektile ja alustab tööpäeva — asukoht kontrollitakse
> enne, kui kell käima läheb. Kui ta objektilt lahkub, peatub arvestus
> ise. Keegi ei pea midagi vajutama ega meeles pidama.
>
> Kuu lõpus on iga päev kirjas koos objekti, kellaaegade ja tundidega.
>
> 5 € kasutaja kohta kuus, esimesed 14 päeva tasuta.

**Pealkiri:** Nii tööaeg päriselt salvestub
**Kirjeldus:** Ehitusettevõtetele · iOS, Android ja arvuti

## Üksikute slaidide tekstid

Kui kasutad slaide eraldi kuulutustena, mitte karussellina:

**01 — Alusta ainult objektil**

> Tööpäeva saab alustada ainult objektil kohapeal. Asukohta kontrollib
> server, mitte telefon — seega äpi muutmine ei aita.

**02 — Kell käib, kui oled kohal**

> Tunnid koguvad objektil viibitud aja pealt. Mitte nupuvajutuse, mitte
> mälu, mitte tabeli järgi.

**03 — Lahkud, kell peatub**

> Töötaja sõidab objektilt ära ja arvestus peatub ise. Objektilt
> lahkumine peatab kella, aga ei lõpeta tööpäeva — tagasi tulles jätkub.

**04 — Iga päev on kirjas**

> Objekt, kellaajad ja tunnid nädalate kaupa. Kuu lõpus ei ole vaja
> kellegi mälu usaldada.

**05 — Proovi tasuta**

> 5 € kasutaja kohta kuus. iOS, Android ja arvutiliides brauseris.
> Neli keelt: eesti, inglise, vene, ukraina. Esimesed 14 päeva tasuta.

## Kumba komplekti millal

- **Külm sihtrühm** → `social/` nr 1 (`10 h kirjas. 5 h objektil.`).
  Konks peab tulema enne toodet.
- **Huvi tekkinud, lehte vaadanud** → `app/` karussell. Nüüd tahab
  inimene näha, mida ta päriselt saab.
- **Retargeting** → `social/` nr 5 või `app/` nr 5 (hind).

## Üks asi, mida lõppslaid EI ütle

**"Laadi alla".** Äpp ei ole veel poes ja vale lubadus toob kliendi, kes
esimese klikiga pettub. CTA on sama mis lehel: *Proovi tasuta*,
aadressilt `stp.nutisemud.ee`. Kui äpp poodi jõuab, muuda seda skriptis
ühes kohas ja tee komplekt uuesti.
