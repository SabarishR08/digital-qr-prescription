import crypto from "crypto";

function base64UrlEncode(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getSigningKey() {
  const key = process.env.QR_SIGNING_KEY;
  if (!key) {
    throw new Error("QR_SIGNING_KEY is not set");
  }
  return key;
}

export type QrPayload = {
  prescriptionId: string;
  issuedAt: number;
  exp: number;
  nonce: string;
};

export function createQrPayload(prescriptionId: string, expiresAt: Date) {
  const payload: QrPayload = {
    prescriptionId,
    issuedAt: Date.now(),
    exp: expiresAt.getTime(),
    nonce: crypto.randomBytes(12).toString("hex")
  };

  const payloadEncoded = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payloadEncoded)
    .digest();
  const signatureEncoded = base64UrlEncode(signature);

  return `${payloadEncoded}.${signatureEncoded}`;
}

export function verifyQrPayload(token: string) {
  const [payloadEncoded, signatureEncoded] = token.split(".");
  if (!payloadEncoded || !signatureEncoded) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payloadEncoded)
    .digest();
  const actualSignature = base64UrlDecode(signatureEncoded);

  if (expectedSignature.length !== actualSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  const payloadRaw = base64UrlDecode(payloadEncoded).toString("utf-8");
  const payload = JSON.parse(payloadRaw) as QrPayload;
  if (Date.now() > payload.exp) {
    return null;
  }

  return payload;
}
