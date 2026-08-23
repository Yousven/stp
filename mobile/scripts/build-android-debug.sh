#!/usr/bin/env bash
# Ehitab Android debug-APK käsurealt, ilma Android Studiota.
# Eeldab: `brew install --cask android-commandlinetools`,
#         `brew install openjdk@17 openjdk@21`
# ja et ~/.gradle/gradle.properties sisaldab:
#   org.gradle.java.installations.paths=/opt/homebrew/opt/openjdk@17,/opt/homebrew/opt/openjdk@21
# (kaks JDK-d on vajalikud, kuna erinevad Capacitori Gradle moodulid
# nõuavad erinevat Java toolchaini — vt mobile/README.md "Android CLI-ga".)
set -euo pipefail

cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export PATH="$JAVA_HOME/bin:$PATH"

npm run build
npx cap sync android
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleDebug

echo
echo "APK: $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
