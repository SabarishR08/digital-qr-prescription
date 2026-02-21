export type ScanLog = {
  id: string;
  prescriptionId?: string | null;
  actorId: string;
  actorRole: string;
  payloadHash: string;
  result: string;
  reason?: string | null;
  createdAt: string;
};
