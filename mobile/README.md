# TarMel mobiiliäpp

React + TypeScript + Vite SPA, mis räägib `../api` REST API-ga, pakitud
Capacitoriga natiivseks Android/iOS äpiks. Osa plaanist Faas 2:
`/Users/margo.hain/.claude/plans/bubbly-exploring-hartmanis.md`

## Ekraanid

- Login → Dashboard (aktiivne/viimane töölogi, kuu kokkuvõte)
- Alusta tööpäeva (objekti valik)
- Lõpeta tööpäev (kommentaar, sõidu-/lõunaaeg)
- Tööajalugu (filtreeritav nimekiri, kokku tunnid)

Geofencing (`src/hooks/useGeofence.ts`) kontrollib praegu **esiplaanil**
asukohta dashboard'i avamisel, pariteet praeguse veebirakendusega —
sama Haversine valem, mis `dashboard.php`-s. Taustal töötav (native
background-geolocation) versioon on järgmine samm, kui äppi saab
päris seadmel testida.

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
