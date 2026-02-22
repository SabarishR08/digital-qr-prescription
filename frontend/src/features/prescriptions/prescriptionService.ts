import type { Medication, Prescription } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type CreatePrescriptionPayload = {
  patientName: string;
  patientEmail: string;
  notes?: string;
  medications: Medication[];
  expiresAt?: string;
};

type CreatePrescriptionResponse = {
  prescription: Prescription;
  qrCode: string;
};

type VerifyResponse = {
  prescription: Prescription;
};

type ListResponse = {
  prescriptions: Prescription[];
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

export async function createPrescription(token: string, payload: CreatePrescriptionPayload) {
  return request<CreatePrescriptionResponse>("/prescriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export async function verifyPrescription(token: string, qrPayload: string) {
  return request<VerifyResponse>("/prescriptions/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ qrPayload })
  });
}

export async function fetchMyPrescriptions(
  token: string,
  options: {
    includeQr?: boolean;
    limit?: number;
    cursor?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  const includeQr = options.includeQr ?? true;

  if (includeQr) {
    params.set("includeQr", "true");
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  const suffix = params.toString();
  return request<ListResponse>(`/prescriptions${suffix ? `?${suffix}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}
