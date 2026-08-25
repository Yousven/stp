# Turvalisus

## Avatud andmebaasi parool vanas `config/config.php` — vahetamata

**Seis:** fail on repost eemaldatud, aga parool on git-ajaloos endiselt
loetav ja **kehtib seni, kuni see andmebaasis vahetatakse**.

### Mis lekkis

| | |
|---|---|
| Mandaat | MySQL kasutaja `app` parool andmebaasile `time_tracking` |
| Kus oli | `config/config.php` rida 17, avatekstis |
| Kui kaua | Commitist `9db87cb` (25.02.2025) kuni `b71e625`-ni (25.08.2026) — **kogu repo eluaeg** |
| Kes kasutab | Vana PHP rakendus (tarmel.gretmar.ee). Uus API kasutab **teist andmebaasi ja teist parooli** |

**Faili kustutamine ei kustuta parooli.** `git log -p` näitab seda
endiselt, mõlemas remote'is (`origin` ja `stp`) ning igas kloonis, mis
kellelgi olemas on. Ainus asi, mis leket päriselt lõpetab, on parooli
vahetamine — ajaloo puhastamine üksi ei aita, sest kloonid on juba tehtud.

### Vahetamise plaan

Tee need sammud järjest, ühes seansis — kahe sammu vahel on rakendus
katki, kuna vana parool enam ei kehti ja uus pole veel konfiguratsioonis.

**1. Genereeri uus parool**

```bash
openssl rand -base64 24
```

**2. Vaheta see MySQL-is** (vanas serveris, kus `time_tracking` asub)

```sql
ALTER USER 'app'@'localhost' IDENTIFIED BY '<uus parool>';
FLUSH PRIVILEGES;
```

Kui kasutaja on defineeritud muu hosti kui `localhost` jaoks, kontrolli
enne: `SELECT user, host FROM mysql.user WHERE user = 'app';` — iga rida
tuleb eraldi uuendada, muidu jääb üks tee vana parooliga lahti.

**3. Uuenda serveris `config/config.php`**

Fail elab serveris, mitte enam siin repos. Muuda seal `$db_pass` väärtus.
**Ära pane uut parooli gitti** — kui vana PHP rakendust on vaja edasi
hooldada, loe parool keskkonnamuutujast:

```php
$db_pass = getenv('DB_PASS') ?: die('DB_PASS puudub');
```

**4. Kontrolli, et vana rakendus töötab**

Ava tarmel.gretmar.ee, logi sisse, vaata et dashboard laeb. Kui ei tööta,
vaata PHP error-logi — vale parool annab seal "Access denied for user".

**5. Kontrolli, kas keegi veel kasutab sama mandaati**

Enne vahetamist tasub üle vaadata, kas see MySQL kasutaja on kasutusel ka
mujal — cron-skriptides, varunduses, mõnes vanas ühenduses. Vahetamise
järel murduvad need kõik korraga.

```bash
# vanas serveris
grep -rn "Morphing-Crispy5-Shabby" /etc /var/www /home /opt 2>/dev/null
```

### Kas ajalugu tuleks puhastada?

**Ei ole kohustuslik ja seda saab teha hiljem.** Pärast parooli
vahetamist on ajaloos olev string väärtusetu.

Puhastamine (`git filter-repo`) tähendaks kõigi commitide ümberkirjutamist
ja force-push'i mõlemasse remote'i; iga olemasolev kloon tuleks uuesti
teha. Ühe arendaja ja privaatse repo puhul ei ole see vaev väärt.

**Aga:** kui see repo kunagi avalikuks tehakse või kellelegi väljapoole
antakse, tuleb ajalugu enne seda puhastada — vastasel juhul on parool
(ja kogu vana koodibaas) lugejale nähtav.

### Uute saladuste vältimine

- Repos on juurkaustas `.gitignore`, mis blokeerib `.env` failid.
- `api/.env.example` ja `mobile/.env.example` sisaldavad ainult
  kohatäiteid (`"password"`, `"change-me-access"`) — päris väärtused
  elavad ainult serveris `.env` failis.
- Enne commiti tasub uue saladuse kahtluse korral vaadata:
  `git diff --cached | grep -iE "password|secret|key"`.

## Muud teadaolevad lahtised otsad

- **HTTPS** — API jookseb praegu lahtise HTTP peal LAN-i IP-l. Kasutaja
  seadistab Cloudflare'i ja TLS-i eraldi.
- **Varundused** — lahendatud virtuaalmasina tasemel (kogu VM-i
  hetktõmmis), eraldi andmebaasi varundusskripti ei ole ega ole vaja.
