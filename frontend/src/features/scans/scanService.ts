import type { ScanLog } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ScanResponse = {
  scans: ScanLog[];
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

export async function fetchScanHistory(token: string, limit = 10) {
  return request<ScanResponse>(`/scans/recent?limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
