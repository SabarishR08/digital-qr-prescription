export const ROLE_VALUES = ["DOCTOR", "PATIENT", "PHARMACIST", "ADMIN"] as const;
export type Role = (typeof ROLE_VALUES)[number];
