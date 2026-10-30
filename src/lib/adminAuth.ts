import crypto from "crypto";

const DEFAULT_PIN = "Hafiz2006!";

function getSecret(): string {
  return process.env.ADMIN_PIN || DEFAULT_PIN;
}

export function createAdminToken(): string {
  const secret = getSecret();
  const payload = JSON.stringify({
    role: "admin",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  });

  const base64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(base64Payload)
    .digest("base64url");

  return `${base64Payload}.${signature}`;
}

export function verifyAdminToken(token?: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [base64Payload, signature] = parts;
    const secret = getSecret();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(base64Payload)
      .digest("base64url");

    if (signature !== expectedSignature) return false;

    const payloadStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    if (payload.role !== "admin" || !payload.exp) return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}
