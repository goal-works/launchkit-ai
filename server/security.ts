import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function issueSecret(prefix: string): { secret: string; preview: string; hash: string } {
  const secret = `${prefix}_${randomBytes(24).toString("base64url")}`;
  return {
    secret,
    preview: secret.slice(0, prefix.length + 9),
    hash: createHash("sha256").update(secret).digest("hex"),
  };
}

function sessionSecret(): string {
  const configured = process.env.LAUNCHKIT_SESSION_SECRET;
  if (configured) {
    if (configured.length < 32) throw new Error("LAUNCHKIT_SESSION_SECRET must be at least 32 characters");
    return configured;
  }
  if (process.env.NODE_ENV === "production" && process.env.LAUNCHKIT_DATA_MODE !== "memory") {
    throw new Error("LAUNCHKIT_SESSION_SECRET is required outside memory demo mode");
  }
  return "launchkit-local-demo-session-secret-not-for-production";
}

export type SessionPayload = { userId: string; organizationId: string };

export function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [body, supplied] = value.split(".");
  if (!body || !supplied) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest();
  const actual = Buffer.from(supplied, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return payload.userId && payload.organizationId ? payload : null;
  } catch {
    return null;
  }
}

export function deriveWebhookSecret(endpointId: string): string {
  const material = createHmac("sha256", sessionSecret()).update(`webhook.${endpointId}`).digest("base64url");
  return `whsec_demo_${material}`;
}

export function webhookSignature(payload: string, endpointId: string): string {
  return `sha256=${createHmac("sha256", deriveWebhookSecret(endpointId)).update(payload).digest("hex")}`;
}
