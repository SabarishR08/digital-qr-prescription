import type { ScanLog } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ScanResponse = {
  scans: ScanLog[];
  total: number;
  limit: number;
  offset: number;
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

export async function fetchScanHistory(token: string, limit = 10, offset = 0) {
  return request<ScanResponse>(`/scans/recent?limit=${limit}&offset=${offset}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

type ScanFilters = {
  limit?: number;
  offset?: number;
  result?: string;
  prescriptionId?: string;
  actorRole?: string;
  from?: string;
  to?: string;
};

export async function fetchScanHistoryFiltered(token: string, filters: ScanFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.offset) {
    params.set("offset", String(filters.offset));
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

  return request<ScanResponse>(`/scans/recent?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function exportScanCsv(token: string, filters: ScanFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.offset) {
    params.set("offset", String(filters.offset));
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
