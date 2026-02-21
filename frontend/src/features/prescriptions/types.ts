export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

export type Prescription = {
  id: string;
  doctorId: string;
  patientName: string;
  patientEmail: string;
  medications: Medication[];
  notes?: string | null;
  qrPayload: string;
  qrCode?: string | null;
  status: string;
  redeemedAt?: string | null;
  redeemedById?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
