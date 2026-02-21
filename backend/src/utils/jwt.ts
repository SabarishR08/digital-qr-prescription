import jwt from "jsonwebtoken";
import type { Role } from "../types/roles";

type AuthTokenPayload = {
  sub: string;
  role: Role;
  email: string;
  fullName: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "12h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
