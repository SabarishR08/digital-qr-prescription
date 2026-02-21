import type { PreferenceDefaultsResponse, UserPreferences } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const STORAGE_KEY = "qr-prescription:user-preferences";

const DEFAULTS: UserPreferences = {
  auditRefreshEnabled: true,
  auditRefreshInterval: 15000,
  scanRefreshEnabled: true,
  scanRefreshInterval: 15000,
  scanPinnedVisible: true
};

export function loadLocalPreferences(): UserPreferences | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveLocalPreferences(preferences: UserPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error ?? "Request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchPreferences(token: string) {
  const response = await request<{ preference: UserPreferences }>("/user/preferences", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.preference;
}

export async function updatePreferences(token: string, updates: Partial<UserPreferences>) {
  const response = await request<{ preference: UserPreferences }>("/user/preferences", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });

  return response.preference;
}

export async function resetPreferences(token: string) {
  const response = await request<{ preference: UserPreferences }>("/user/preferences/reset", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.preference;
}

export async function fetchAdminDefaults(token: string) {
  return request<PreferenceDefaultsResponse>("/user/preferences/defaults", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateAdminDefaults(
  token: string,
  updates: Partial<UserPreferences>
) {
  return request<PreferenceDefaultsResponse>("/user/preferences/defaults", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
}

export function mergePreferences(
  current: UserPreferences,
  updates: Partial<UserPreferences>
): UserPreferences {
  return { ...current, ...updates };
}

export function getDefaultPreferences(): UserPreferences {
  return { ...DEFAULTS };
}
