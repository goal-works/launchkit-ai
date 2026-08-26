import { createClient } from "redis";

import type { Actor } from "./domain/types";
import { service } from "./container";

export type WebhookJobPayload = { actor: Actor; endpointId: string };

export async function enqueueWebhookTest(payload: WebhookJobPayload) {
  if ((process.env.LAUNCHKIT_INLINE_JOBS ?? "true") === "true") {
    return service.testWebhook(payload.actor, payload.endpointId);
  }
  const client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6380" });
  await client.connect();
  try {
    await client.lPush("launchkit:jobs", JSON.stringify(payload));
  } finally {
    await client.quit();
  }
  return { status: "queued" as const };
}
