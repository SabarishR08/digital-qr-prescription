import crypto from "crypto";

const TOKEN_BYTES = 64;

export function generateRefreshToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
