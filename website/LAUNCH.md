# LAUNCH.md — mis on enne avaldamist veel vaja

Turundusleht on tehniliselt valmis. Siin on kõik, mis EI OLE koodi
küsimus — asjad, mida saab anda ainult **Nutisemud OÜ**.

Sihtaadress: **https://stp.nutisemud.ee** (Cloudflare Pages)

---

## 1. Avaldamise blokeerijad

Need peavad olema olemas, enne kui leht avalikuks läheb.

### 1.1 Juriidilised rekvisiidid

`src/config/site.ts` → `site.legal`. Kõik väärtused on praegu `null` ja
seda **ei tohi ise täita** — need on ametlikud andmed.

| Väli | Väärtus | Kus ilmub |
|---|---|---|
| `registryCode` | ? | juriidilised lehed |
| `vatNumber` | ? | juriidilised lehed |
| `address` | ? | juriidilised lehed |
| `email` | ? | juriidilised lehed, kontakt |
| `phone` | ? | juriidilised lehed, kontakt |

Komponendid jätavad `null`-väljad lihtsalt renderdamata, seega leht ei
lähe katki — aga kontaktilehel ei ole siis midagi peale ettevõtte nime.

### 1.2 Juriidiline sisu

Kolm lehte on olemas, aga **sisu on kinnitamata** ja lehed ütlevad seda
ise välja. Nad on `noindex` ja sitemap'ist väljas.

| Leht | Tee | Seis |
|---|---|---|
| Privaatsuspoliitika | `/privacy/` | tekst puudub |
| Kasutustingimused | `/terms/` | tekst puudub |
| Kontakt | `/contact/` | andmed puuduvad |

Väljamõeldud tingimusi siia ei kirjutatud ja ei tohi kirjutada. Kui
lõplik tekst on olemas: asenda `src/components/legal/LegalPage.astro`
sisu ja **eemalda `noindex`**.

Privaatsuspoliitika peab katma vähemalt selle, mida **toode** teeb
(asukoht, kohalolekusündmused, tööajaandmed) — mitte ainult seda, mida
turundusleht teeb (praegu ei midagi: küpsiseid ega analytics'it ei ole).

### 1.3 Fondilitsentsid

`public/fonts/` all on kolme pere woff2-failid. Litsentsifailid
(SIL Open Font License) tuleb sinna kõrvale panna. Vt `ASSETS.md`.

---

## 2. Otsustamist vajav

### 2.1 Analytics-provider

Sündmuste kiht on valmis ja provider-agnostiline
(`src/lib/analytics.ts`), aga **providerit ei ole valitud**. Leht töötab
ilma selleta ega tee ühtegi võrgupäringut.

Kui provider lisandub:

1. lisa tema skript,
2. sea `window.stpAnalytics.push`, mis sündmuse edasi saadab,
3. **lisa tema domeen CSP `connect-src`-i ja `script-src`-i**
   (`scripts/build-headers.mjs`) — muidu CSP blokeerib ta vaikselt,
4. kui provider kasutab küpsiseid, vajab leht küpsiseteadet ja
   privaatsuspoliitika peab seda kajastama.

Kogutavad sündmused: `cta_click`, `pricing_view`, `faq_open`,
`language_change`, `scroll_50`, `scroll_90`. PII-d ei saadeta.

### 2.2 CTA sihtkoht

`PUBLIC_CTA_URL`, vaikimisi `https://api.nutisemud.ee/register`.
Kontrolli, et see aadress on see, kuhu uus klient päriselt peab jõudma.
Vigane väärtus **katkestab buildi** (`src/config/site.ts`) — see on
tahtlik: katkine build on parem kui avaldatud leht, mille ainus nupp ei
vii kuhugi.

### 2.3 HSTS preload

`_headers` saadab `Strict-Transport-Security: max-age=31536000;
includeSubDomains`. **`preload` on tahtlikult lisamata** — see on
raskesti tagasi võetav ja nõuab eraldi registreerimist
(hstspreload.org). Lisa ainult teadliku otsusena.

---

## 3. Cloudflare Pages — samm-sammult

### 3.1 Projekt

1. Cloudflare → Workers & Pages → **Create → Pages → Connect to Git**
2. Vali repositoorium **`Yousven/stp`**, haru `main`

### 3.2 Buildi seaded

| Väli | Väärtus |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `website` |
| Node version | `22` |

`npm run build` teeb kaks asja: `astro build` ja seejärel
`node scripts/build-headers.mjs`, mis genereerib `dist/_headers`.
**Kui buildi käsku muudetakse, kaovad turvapäised.**

### 3.3 Keskkonnamuutujad

| Nimi | Väärtus | Kus |
|---|---|---|
| `PUBLIC_CTA_URL` | `https://api.nutisemud.ee/register` | Production + Preview |

### 3.4 Domeen

1. Pages'i projekt → **Custom domains → Set up a custom domain**
2. `stp.nutisemud.ee`
3. Cloudflare loob CNAME-kirje ise

**`api.nutisemud.ee` jääb puutumata** — see on uus kirje, mitte muudatus
olemasolevas. `cloudflared` tunneli konfiguratsiooni ei muudeta.

### 3.5 HTTPS

Cloudflare annab sertifikaadi automaatselt. Kontrolli, et
**Always Use HTTPS** on sees (SSL/TLS → Edge Certificates).

### 3.6 Päised

`_headers` tuleb buildist kaasa, käsitsi midagi seadistada ei ole vaja.
Kontrolli pärast esimest deployd:

```bash
curl -sI https://stp.nutisemud.ee/ | grep -i "content-security-policy\|strict-transport\|x-content-type"
```

### 3.7 robots ja canonical

```bash
curl -s https://stp.nutisemud.ee/robots.txt
curl -s https://stp.nutisemud.ee/ | grep -o '<link rel="canonical"[^>]*>'
```

Canonical peab olema `https://stp.nutisemud.ee/`, **mitte** Pages'i
`*.pages.dev` aadress.

### 3.8 Sitemap

```bash
curl -s https://stp.nutisemud.ee/sitemap-index.xml
curl -s https://stp.nutisemud.ee/sitemap-0.xml | grep -c "<loc>"
```

Peab sisaldama **ainult nelja** aadressi (neli keelt). Juriidilised lehed
ja 404 on teadlikult väljas.

### 3.9 Suitsutest

- [ ] `/`, `/en/`, `/ru/`, `/uk/` avanevad
- [ ] `/privacy/`, `/terms/`, `/contact/` avanevad kõigis keeltes
- [ ] olematu aadress annab **404** ja näitab "SIIN EI OLE OBJEKTI."
- [ ] kõik neli CTA-d (nav, hero, hind, lõpp) viivad `PUBLIC_CTA_URL`-ile
- [ ] keelevahetus jääb samale lehele
- [ ] konsoolis ei ole CSP-rikkumisi
- [ ] leht töötab päris iPhone'i Safaris (vt allpool)

---

## 4. Mis on veel päris seadmes kontrollimata

Testitud on **Playwright WebKit** (Safari mootor) ja Chrome. Päris
seadmes kontrollimata jäävad asjad, mis emulatsioonis ei avaldu:

- **mobiili-Safari aadressiriba** — riba peitmine/ilmumine muudab
  `100svh`-i ja võib pinnitud sektsioonide kõrgust nihutada
- **iOS-i inertsiaalne kerimine** pinnitud sektsioonides (S2, S3)
- **iOS-i "back-forward cache"** — tagasinupuga naastes peab
  ScrollTrigger end uuesti arvutama
- **päris seadme fondirenderdus** ja `backdrop-filter`-i jõudlus

Kontrolli need enne avaldamist ühe päris iPhone'i peal läbi.
