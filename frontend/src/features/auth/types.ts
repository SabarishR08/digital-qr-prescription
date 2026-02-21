export type Role = "DOCTOR" | "PATIENT" | "PHARMACIST" | "ADMIN";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};
