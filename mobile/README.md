# SmartTimePlanning mobiiliäpp

React + TypeScript + Vite SPA, mis räägib `../api` REST API-ga, pakitud
Capacitoriga natiivseks Android/iOS äpiks. Osa plaanist Faas 2:
`/Users/margo.hain/.claude/plans/bubbly-exploring-hartmanis.md`

## Ekraanid

- Login → Dashboard (aktiivne/viimane töölogi, kuu kokkuvõte)
- Alusta tööpäeva (objekti ja töö liigi valik, nõuab asukohta)
- Lõpeta tööpäev (kommentaar, sõidu-/lõunaaeg)
- Tööajalugu (filtreeritav nimekiri, kokku tunnid)
- Puudumised (töötaja näeb enda omi; admin lisab ja kustutab)
- Admin: objektid, kasutajad, meeskonna ülevaade, seaded, raportid,
  kulukoodid, arveldus, tellimus

Dashboard, objektide loend ja tööpäeva lõpetamine töötavad ka ilma levita —
vt `src/api/offlineQueue.ts` ja API README peatükki "Töötamine ilma levita".

## Kohaloleku kontroll (petmisvastane tuum)

Kaks kihti, mis peavad koos töötama:

1. **Sisseregistreerimine** (`src/pages/StartWorkPage.tsx`) küsib asukoha
   ja saadab selle serverisse; **server kontrollib** kaugust objektist ja
   keeldub, kui oled väljas (`api/src/routes/timeLogs.routes.ts`). Kuna
   kontroll on serveris, ei aita äpi muutmine ega kontrolli vahelejätmine.
2. **Kohaloleku jälgimine** salvestab ENTER/EXIT sündmusi; tunnid
   arvutatakse nende intervallide summana (`api/src/utils/timeStats.ts`,
   ühikutestid `timeStats.test.ts`). Objektilt lahkumine **peatab kella**,
   ei lõpeta tööpäeva.

Jälgimisel on omakorda kaks režiimi:

- **Esiplaanil** (`src/hooks/useGeofence.ts`) — kontroll dashboard'i
  avamisel. Töötab alati, ka ilma taustaloata ja veebis.
- **Taustal** (`src/hooks/useBackgroundGeofence.ts` + natiivne plugin) —
  OS valvab ringi ise ja äratab äpi ainult piiri ületamisel. Töötab ka
  siis, kui äpp on täielikult suletud.

### Miks taustajälgimine akut ei söö

Plugin EI polli GPS-i. Ta registreerib ühe ringi OS-ile
(iOS `CLLocationManager.startMonitoring(for: CLCircularRegion)`,
Android Play Services `GeofencingClient`) ja OS kasutab piiri valvamiseks
odavaid signaale (mobiilimastid/WiFi), äratades äpi ainult siis, kui piir
tegelikult ületatakse. Kui kunagi ilmub aku-kaebusi, kontrolli esimesena,
ega kuskile pole tekkinud pidevat `watchPosition`/`requestLocationUpdates`
kutset — see oleks päris põhjus, mitte region monitoring.

Natiivne pool ei tee ise HTTP-päringuid: sündmused lähevad seadmes
järjekorda (`GeofenceQueue.java` / `UserDefaults` iOS-il) ja JS tõstab need
serverisse äpi avamisel. Nii ei pea JWT/refresh loogikat kolmes kohas
dubleerima. Sündmustel on OS-i ajatempel, seega hiline üleslaadimine ei
moonuta tunde — halvim tagajärg on, et admin näeb andmeid viivitusega.

## Kohalik arendus (brauseris)

```bash
cp .env.example .env.local     # VITE_API_BASE_URL, vaikimisi localhost:3000/api
npm install
npm run dev                    # http://localhost:5173
```

Eeldab, et `../api` jookseb (`npm run dev` seal, vt api/README.md).

## Natiivsed platvormid (Capacitor)

Android- ja iOS-projektid on juba skafolditud (`android/`, `ios/`).

### Android — käsurealt, ilma Android Studiota

Android Studio pole ehitamiseks tegelikult kohustuslik — ainult SDK +
JDK on vaja, mõlemad saab paigaldada Homebrew'ga ilma GUI-ta:

```bash
brew install --cask android-commandlinetools
brew install openjdk@17 openjdk@21   # jah, mõlemad — vt allpool
yes | sdkmanager --licenses --sdk_root=/opt/homebrew/share/android-commandlinetools
sdkmanager --sdk_root=/opt/homebrew/share/android-commandlinetools \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Registreeri mõlemad JDK-d Gradle'i toolchaini jaoks (masinapõhine
seadistus, käib `~/.gradle/gradle.properties` faili, mitte projekti):

```
org.gradle.java.installations.paths=/opt/homebrew/opt/openjdk@17,/opt/homebrew/opt/openjdk@21
```

(Kaks JDK-d on vaja, sest osa Capacitori Gradle-mooduleid nõuab
compile-toolchainiks Java 21, aga Gradle ise käivitub JDK 17/21-ga —
ilma mõlemata visatakse kas "Cannot find a Java installation... 21"
või "invalid source release: 21".)

Seejärel:

```bash
./scripts/build-android-debug.sh
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

APK saab installida otse telefoni (`adb install <apk>` kui USB
debugimine on lubatud, või kopeeri fail telefoni ja ava — nõuab
"tundmatutest allikatest paigaldamine" luba). Emulaatori jaoks (kui
päris telefoni pole käepärast) on Android Studio siiski mugavam, aga
CLI-only variant on ka võimalik `avdmanager` + `emulator` binaaridega.

## Push-teavitused

Kood on valmis ja degradeerub vaikselt, kui push pole saadaval (veeb,
Firebase seadistamata, Apple konto puudub) — `src/hooks/usePushNotifications.ts`.
Registreerimine käib sisselogimisel, token saadetakse serverisse ainult siis
kui see on muutunud, ja väljalogimisel eemaldatakse.

Töölesaamiseks vajalik (vt ka `../api/README.md`):

- **Android**: Firebase projekt → `google-services.json` faili
  `android/app/google-services.json`. Ilma selleta build õnnestub, aga
  registreerimine ebaõnnestub vaikselt (`android/app/build.gradle` rakendab
  google-services plugina ainult siis, kui fail on olemas).
- **iOS**: **tasuline Apple Developer konto (99$/a)**. Tasuta Personal Team
  ei toeta Push Notifications võimekust — seda ei saa koodiga lahendada.
  Kontoga: Xcode → Signing & Capabilities → + Capability → Push
  Notifications, ja APNs .p8 võti Firebase'i.

### iOS — vajab Xcode't

Erinevalt Androidist pole siin käsurea-only teed: täismahus **Xcode**
saab ainult App Store'ist, mis nõuab Apple ID sisselogimist — seda
saab teha ainult inimene, mitte agent. Ilma Xcode'ita ei tööta
absoluutselt mitte miski iOS-i jaoks (ei `xcodebuild`, ei iOS SDK,
ei seadmehaldus) — Command Line Tools üksi ei piisa.

See projekt kasutab Capacitor 8 vaikimisi **Swift Package Manageri**
(`ios/App/CapApp-SPM/Package.swift`), MITTE CocoaPodsi — nii et
`pod install` pole vajalik. Xcode lahendab SPM sõltuvused ise
projekti esmakordsel avamisel (vajab internetiühendust).

```bash
npx cap open ios         # avab projekti Xcode'is (pärast Xcode paigaldamist)
```

Päris iPhone'is käivitamiseks Xcode'is:
1. Xcode → Settings → Accounts → lisa oma Apple ID (tasuta konto sobib)
2. Vali projekti "App" target → Signing & Capabilities → vali oma
   Apple ID "Team"-iks (Xcode loob automaatselt "Personal Team")
3. Ühenda iPhone kaabliga, telefonis "Trust This Computer?" → Trust
4. Vali ülal seadmete rippmenüüst oma iPhone, vajuta ▶ Run
5. Esimesel käivitusel telefonis: Settings → General → VPN & Device
   Management → usalda arendaja sertifikaat
Tasuta Apple ID-ga aegub allkiri 7 päeva pärast — Xcode'is Run
uuendab selle uuesti.

### Web-koodi muutmise järel enne natiivsesse projekti sünkimist

```bash
npm run build
npx cap sync
```

## Deploy toodangusse

`VITE_API_BASE_URL` peab enne `npm run build` käivitamist osutama
Proxmoxi API avalikule aadressile (vt `../api/deploy/`). Web-build
(`dist/`) saab ka ise deployda tavalise staatilise saidina (nt admini
kasutuseks brauseris), samal ajal kui sama build läheb Capacitori
kaudu App Store'i / Play Store'i.
