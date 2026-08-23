import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../api/client";
import type { AuthUser, LoginResponse } from "../api/types";
import { clearSession, getAccessToken, getStoredUser, setSession } from "./tokenStore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getAccessToken(), getStoredUser()]);
      if (token && storedUser) {
        setUser(storedUser);
      }
      setLoading(false);
    })();
  }, []);

  async function login(username: string, password: string) {
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
    await setSession(data.accessToken, data.refreshToken, data.user);
    setUser(data.user);
  }

  async function logout() {
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    await clearSession();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth peab olema kasutatud AuthProvideri sees.");
  return ctx;
}
