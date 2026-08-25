import { Preferences } from "@capacitor/preferences";
import type { AuthUser } from "../api/types";

const ACCESS_KEY = "stp_access_token";
const REFRESH_KEY = "stp_refresh_token";
const USER_KEY = "stp_user";
const PUSH_TOKEN_KEY = "stp_push_token";

export async function getAccessToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: ACCESS_KEY });
  return value;
}

export async function getRefreshToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: REFRESH_KEY });
  return value;
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const { value } = await Preferences.get({ key: USER_KEY });
  return value ? (JSON.parse(value) as AuthUser) : null;
}

export async function setAccessToken(accessToken: string): Promise<void> {
  await Preferences.set({ key: ACCESS_KEY, value: accessToken });
}

export async function setSession(accessToken: string, refreshToken: string, user: AuthUser): Promise<void> {
  await Promise.all([
    Preferences.set({ key: ACCESS_KEY, value: accessToken }),
    Preferences.set({ key: REFRESH_KEY, value: refreshToken }),
    Preferences.set({ key: USER_KEY, value: JSON.stringify(user) }),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    Preferences.remove({ key: ACCESS_KEY }),
    Preferences.remove({ key: REFRESH_KEY }),
    Preferences.remove({ key: USER_KEY }),
  ]);
}

/**
 * Viimati serverisse saadetud push-token. Hoiame seda, et mitte saata sama
 * tokenit uuesti igal äpi avamisel — FCM annab sama väärtuse tagasi seni,
 * kuni see ei ole uuenenud.
 */
export async function getPushToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: PUSH_TOKEN_KEY });
  return value;
}

export async function setPushToken(token: string): Promise<void> {
  await Preferences.set({ key: PUSH_TOKEN_KEY, value: token });
}

export async function clearPushToken(): Promise<void> {
  await Preferences.remove({ key: PUSH_TOKEN_KEY });
}
