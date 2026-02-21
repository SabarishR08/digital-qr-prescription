"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User, Role } from "./types";
import {
  getCurrentUser,
  login as loginRequest,
  refreshAccessToken,
  register as registerRequest,
  logout as logoutRequest
} from "./authService";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: Exclude<Role, "ADMIN">;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "qr-prescription-token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    const hydrate = async () => {
      try {
        if (stored) {
          setToken(stored);
          try {
            const profile = await getCurrentUser(stored);
            setUser(profile);
            return;
          } catch {
            const refreshed = await refreshAccessToken();
            window.localStorage.setItem(STORAGE_KEY, refreshed.token);
            setToken(refreshed.token);
            setUser(refreshed.user);
            return;
          }
        }

        const refreshed = await refreshAccessToken();
        window.localStorage.setItem(STORAGE_KEY, refreshed.token);
        setToken(refreshed.token);
        setUser(refreshed.user);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    window.localStorage.setItem(STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (payload: {
    fullName: string;
    email: string;
    password: string;
    role: Exclude<Role, "ADMIN">;
  }) => {
    const result = await registerRequest(payload);
    window.localStorage.setItem(STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    logoutRequest().catch(() => undefined);
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout
    }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
