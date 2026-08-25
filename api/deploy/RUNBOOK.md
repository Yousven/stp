# Deploy'i käiguplaan

Konkreetne sammude järjekord serverisse viimiseks. Kirjutatud selleks, et
deploy ei oleks mäluharjutus.

**Server:** Ubuntu 24.04 VM Proxmoxis, projekt kaustas `/opt/stp`.
**Repo:** `git@github.com:Yousven/stp.git` (remote nimi `stp`, mitte `origin`).

## Enne alustamist — mis on juba läbi proovitud

Need on kohalikult järele tehtud, seega ei peaks üllatama:

- **Docker-build õnnestub** kogu praeguse koodiga.
- **Skeemi uuendus on ohutu.** Läbimäng: vana (serveris praegu olev) skeem
  → andmed sisse → uus skeem peale. `prisma db push` ei küsinud
  `--force-reset`-i, ei hoiatanud andmekaost, ja kõik read jäid alles. Uued
  veerud said vaikeväärtused (`created_offline = 0`, `location_mocked = 0`,
  ülejäänud NULL). Lisandub 6 uut tabelit: `subscriptions`, `holidays`,
  `absences`, `audit_logs`, `cost_codes`, `token_revocations`.
- **Konteiner käivitub ja räägib andmebaasiga** — ettevõtte registreerimine
  ja venekeelne veateade töötasid ehitatud image'i vastu.

## Sammud

### 1. Varundus

VM-i hetktõmmis Proxmoxis enne alustamist. Andmebaasi eraldi varundust ei
ole vaja — kogu masin on tõmmises sees.

### 2. Too kood

```bash
cd /opt/stp
git pull stp main
```

### 3. Täienda `.env` faili

Uued muutujad, mida serveri `.env`-s veel ei ole:

```bash
# Mitu proksit on API ees. Cloudflare'i proksi taga = 2, muidu 1.
TRUST_PROXY_HOPS=2
```

Kontrolli üle ka `CORS_ORIGIN` — sinna peab lisanduma uus HTTPS-domeen,
kui admin-liidest kasutatakse brauserist:

```
CORS_ORIGIN="https://<domeen>,capacitor://localhost,http://localhost,https://localhost"
```

Capacitori päritolud (`capacitor://localhost`) peavad alles jääma, muidu
lakkab natiivne äpp töötamast.

### 4. Ehita ja käivita

```bash
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env up -d --build
```

`--env-file .env` on kohustuslik — ilma selleta ei leia compose
`MYSQL_APP_PASSWORD` muutujat ja MySQL käivitub vale parooliga.

### 5. Uuenda andmebaasi skeem

```bash
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env exec api npx prisma db push
```

**Ära kasuta `--force-reset`-i.** Läbimängu järgi ei ole seda vaja; kui
Prisma seda ikkagi küsib, tähendab see, et serveri skeem erineb oodatust —
peatu ja uuri, ära kinnita.

### 6. Kontrolli käivituslogi

```bash
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env logs api | tail -20
```

Peab näitama:

```
SmartTimePlanning API kuulab pordil 3000
  push-teavitused: ...
  e-post: ...
  vigade jälgimine: ...
  proksi-hüppeid: 2 (Cloudflare + Caddy)
```

Kui proksi-hüpete rida ütleb `1`, aga Cloudflare proksib, on `.env`
täiendamata — vt samm 3.

### 7. Kontrolli kliendi IP-d

```bash
curl https://<domeen>/api/health
```

`clientIp` peab olema sinu enda avalik IP. Kui seal on `172.x` või mõni muu
Cloudflare'i serva-aadress, on `TRUST_PROXY_HOPS` vale ja sisselogimise
piirang loeb kõiki kasutajaid üheks.

### 8. Suuna mobiiliäpp uuele domeenile

`mobile/.env.local` (ei ole gitis):

```
VITE_API_BASE_URL="https://<domeen>/api"
```

Seejärel:

```bash
cd mobile && npm run build && npx cap sync
```

**See on natiivsete äppide jaoks kohustuslik, mitte valikuline.** Ei iOS-i
Info.plist ega Androidi manifest sisalda erandit lahtise HTTP jaoks, seega
`http://192.168.28.107:3000` on natiivses äpis niikuinii blokeeritud —
töötab ainult brauseris ja Vite dev-serveris.

### 9. Suitsutest päris äpiga

- Logi sisse
- Alusta tööpäeva objektil → peab õnnestuma
- Alusta tööpäeva objektist kaugelt → peab andma 403 koos kaugusega
- Vaheta keel vene keelde → nii liides kui serveri veateated peavad
  muutuma

## Tagasipööramine

Kui midagi läheb valesti: taasta VM-i hetktõmmis. Kuna skeemi uuendus on
ainult lisav (uued tabelid ja veerud, midagi ei kustutata), töötab ka vana
konteineri versioon uue skeemi peal — seega saab vajadusel ainult
konteineri tagasi kerida:

```bash
git checkout <eelmine commit>
docker compose -f deploy/docker-compose.with-mysql.yml --env-file .env up -d --build
```
