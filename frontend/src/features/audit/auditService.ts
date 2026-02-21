import type { AuditLog } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuditResponse = {
  logs: AuditLog[];
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

export async function fetchAuditLogs(token: string, limit = 50, cursor?: string) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  return request<AuditResponse>(`/audit/recent?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

type AuditFilters = {
  limit?: number;
  cursor?: string;
  action?: string;
  actorRole?: string;
  prescriptionId?: string;
  from?: string;
  to?: string;
  q?: string;
};

export async function fetchAuditLogsFiltered(token: string, filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.cursor) {
    params.set("cursor", filters.cursor);
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
  if (filters.q) {
    params.set("q", filters.q);
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
  if (filters.q) {
    params.set("q", filters.q);
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

export async function exportAuditJson(token: string, filters: AuditFilters) {
  const params = new URLSearchParams();
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
  if (filters.q) {
    params.set("q", filters.q);
  }
  params.set("format", "json");

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
