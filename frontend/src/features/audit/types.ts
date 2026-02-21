import type { Prescription } from "../prescriptions/types";

export type AuditLog = {
  id: string;
  prescriptionId: string;
  actorRole: string;
  actorId?: string | null;
  action: string;
  result?: string | null;
  details?: string | null;
  createdAt: string;
  prescription: Prescription;
};
