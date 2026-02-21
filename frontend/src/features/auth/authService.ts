import type { User, Role } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuthResponse = {
  token: string;
  user: User;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role: Exclude<Role, "ADMIN">;
};

type LoginPayload = {
  email: string;
  password: string;
};

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

export async function login(payload: LoginPayload) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function register(payload: RegisterPayload) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getCurrentUser(token: string) {
  return request<User>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function refreshAccessToken() {
  return request<AuthResponse>("/auth/refresh", {
    method: "POST"
  });
}

export async function logout() {
  return request<{ ok: boolean }>("/auth/logout", {
    method: "POST"
  });
}
