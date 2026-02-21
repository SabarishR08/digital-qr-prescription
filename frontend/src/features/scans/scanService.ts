import type { ScanLog } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ScanResponse = {
  scans: ScanLog[];
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string | null;
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

export async function fetchScanHistory(token: string, limit = 10, cursor?: string) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  return request<ScanResponse>(`/scans/recent?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

type ScanFilters = {
  limit?: number;
  cursor?: string;
  result?: string;
  prescriptionId?: string;
  actorRole?: string;
  from?: string;
  to?: string;
  q?: string;
};

export async function fetchScanHistoryFiltered(token: string, filters: ScanFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.cursor) {
    params.set("cursor", filters.cursor);
  }
  if (filters.result) {
    params.set("result", filters.result);
  }
  if (filters.prescriptionId) {
    params.set("prescriptionId", filters.prescriptionId);
  }
  if (filters.actorRole) {
    params.set("actorRole", filters.actorRole);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }

  return request<ScanResponse>(`/scans/recent?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function exportScanCsv(token: string, filters: ScanFilters) {
  const params = new URLSearchParams();
  if (filters.result) {
    params.set("result", filters.result);
  }
  if (filters.prescriptionId) {
    params.set("prescriptionId", filters.prescriptionId);
  }
  if (filters.actorRole) {
    params.set("actorRole", filters.actorRole);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }

  const response = await fetch(`${API_BASE}/scans/export?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: "include"
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error ?? "Request failed";
    throw new Error(message);
  }

  return response.blob();
}
