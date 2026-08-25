import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { getPushToken, setPushToken, clearPushToken } from "../auth/tokenStore";

/**
 * Push-teavituste registreerimine ja käsitlemine.
 *
 * Taluma peab kolme olukorda, kus push EI ole saadaval, ilma et äpp katki
 * läheks:
 *  - veeb (brauseris admin-kasutuseks) — plugin puudub täielikult,
 *  - Android ilma google-services.json failita (Firebase seadistamata),
 *  - iOS ilma tasulise Apple Developer kontota (Personal Team ei toeta
 *    Push Notifications võimekust üldse).
 * Seetõttu on kõik kutsed try/catch sees ja vaikivad, kui tugi puudub.
 */
export function usePushNotifications(isLoggedIn: boolean) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isLoggedIn || registeredRef.current) return;
    registeredRef.current = true;

    let listeners: Array<{ remove: () => void }> = [];

    (async () => {
      try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive !== "granted") return;

        const registration = await PushNotifications.addListener("registration", (token) => {
          // Saada server ainult siis, kui token on tegelikult muutunud —
          // väldib mõttetut päringut igal äpi avamisel.
          getPushToken().then((stored) => {
            if (stored === token.value) return;
            apiRequest("/me/device-tokens", {
              method: "POST",
              body: { token: token.value, platform: Capacitor.getPlatform() },
            })
              .then(() => setPushToken(token.value))
              .catch((err) => console.error("Push-tokeni salvestamine ebaõnnestus:", err));
          });
        });

        const regError = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push-teavituste registreerimine ebaõnnestus:", err);
        });

        // Teavitusel klõpsamine viib vastavale lehele (server saadab
        // `data.route` väärtuse).
        const action = await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          const route = event.notification.data?.route;
          if (typeof route === "string" && route.startsWith("/")) {
            navigateRef.current(route);
          }
        });

        listeners = [registration, regError, action];
        await PushNotifications.register();
      } catch (err) {
        // Push pole selles ehituses saadaval — see ei ole viga, mida
        // kasutajale näidata.
        console.info("Push-teavitused pole saadaval:", err);
      }
    })();

    return () => {
      listeners.forEach((l) => l.remove());
    };
  }, [isLoggedIn]);
}

/** Kutsutakse väljalogimisel, et teavitused ei läheks enam sellesse seadmesse. */
export async function unregisterPushToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const token = await getPushToken();
    if (!token) return;
    await apiRequest("/me/device-tokens", { method: "DELETE", body: { token } }).catch(() => undefined);
    await clearPushToken();
  } catch {
    // Väljalogimine ei tohi ebaõnnestuda tokeni koristamise pärast.
  }
}
