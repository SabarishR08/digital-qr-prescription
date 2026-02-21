import type { AuditLog } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuditResponse = {
  logs: AuditLog[];
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

export async function fetchAuditLogs(token: string, limit = 50) {
  return request<AuditResponse>(`/audit/recent?limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

type AuditFilters = {
  limit?: number;
  action?: string;
  actorRole?: string;
  prescriptionId?: string;
  from?: string;
  to?: string;
};

export async function fetchAuditLogsFiltered(token: string, filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.actorRole) {
    params.set("actorRole", filters.actorRole);
  }
  if (filters.prescriptionId) {
    params.set("prescriptionId", filters.prescriptionId);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  return request<AuditResponse>(`/audit/recent?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function exportAuditCsv(token: string, filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.actorRole) {
    params.set("actorRole", filters.actorRole);
  }
  if (filters.prescriptionId) {
    params.set("prescriptionId", filters.prescriptionId);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  const response = await fetch(`${API_BASE}/audit/export?${params.toString()}`, {
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
