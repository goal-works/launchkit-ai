import { createClient } from "redis";

import type { WebhookJobPayload } from "./jobs";
import { service } from "./container";

const client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6380" });
client.on("error", (error) => console.error("LaunchKit worker Redis error", error));

async function main() {
  await client.connect();
  console.log("LaunchKit worker is waiting for webhook jobs");

  while (true) {
    const result = await client.brPop("launchkit:jobs", 5);
    if (!result) continue;
    try {
      const payload = JSON.parse(result.element) as WebhookJobPayload;
      await service.testWebhook(payload.actor, payload.endpointId);
    } catch (error) {
      console.error("LaunchKit worker rejected a job", error);
    }
  }
}

void main().catch((error) => {
  console.error("LaunchKit worker failed", error);
  process.exitCode = 1;
});
