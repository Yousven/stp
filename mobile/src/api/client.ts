import { clearSession, getAccessToken, getRefreshToken, setAccessToken } from "../auth/tokenStore";

/**
 * Kasutaja valitud keel serveri veateadete jaoks.
 *
 * Brauseri enda `Accept-Language` tuleb seadme keelest, mis ei pruugi olla
 * see, mille kasutaja äpis valis — vene keelt kõnelev töötaja eestikeelse
 * telefoniga saaks muidu serverilt ikka eestikeelse teate.
 */
let apiLanguage = "et";

export function setApiLanguage(language: string): void {
  apiLanguage = language;
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken: string };
  await setAccessToken(data.accessToken);
  return data.accessToken;
}

async function doFetch(path: string, method: string, headers: Record<string, string>, body?: unknown) {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": apiLanguage,
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res = await doFetch(path, method, headers, body);

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await doFetch(path, method, headers, body);
    } else {
      await clearSession();
    }
  }

  if (!res.ok) {
    let message = `Viga (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // vastus polnud JSON, jäta vaikimisi sõnum
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Failide allalaadimislingid (raportid) ei saa fetch/blob kaudu käia
// usaldusväärselt WebView-des, seega avatakse need lihtsalt navigeerimisega
// (window.open) — token käib ?token= parameetrina, vt api/src/middleware/auth.ts.
export async function buildDownloadUrl(path: string, params: Record<string, string | undefined> = {}): Promise<string> {
  const token = await getAccessToken();
  const search = new URLSearchParams();
  if (token) search.set("token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${API_BASE}${path}?${search.toString()}`;
}
