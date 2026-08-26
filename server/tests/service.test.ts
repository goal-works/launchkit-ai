import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { DomainError } from "../domain/errors";
import { createSeedState } from "../domain/seed";
import { decodeSession, encodeSession } from "../security";
import { LaunchKitService } from "../service";
import { MemoryStore } from "../store";

const owner = { userId: "user-owner", organizationId: "org-northstar" };
const developer = { userId: "user-developer", organizationId: "org-northstar" };
const viewer = { userId: "user-viewer", organizationId: "org-northstar" };

function fixture() {
  const store = new MemoryStore(createSeedState());
  return { store, service: new LaunchKitService(store) };
}

async function rejectsStatus(operation: () => Promise<unknown>, status: number) {
  await assert.rejects(operation, (error: unknown) => error instanceof DomainError && error.status === status);
}

test("signed sessions round-trip and reject tampering", () => {
  const encoded = encodeSession(owner);
  assert.deepEqual(decodeSession(encoded), owner);
  assert.equal(decodeSession(`${encoded.slice(0, -2)}xx`), null);
  assert.equal(decodeSession("not-a-session"), null);
});

test("organization membership is required independently from authentication", async () => {
  const { service } = fixture();
  await rejectsStatus(() => service.validateActor({ userId: "user-viewer", organizationId: "org-signal" }), 403);
});

test("organization creation grants only the creator an owner membership", async () => {
  const { service } = fixture();
  const created = await service.createOrganization("user-developer", "Model Works");
  const context = await service.validateActor({ userId: "user-developer", organizationId: created.id });
  assert.equal(context.membership.role, "owner");
  await rejectsStatus(() => service.validateActor({ userId: "user-viewer", organizationId: created.id }), 403);
});

test("viewer cannot create a workspace", async () => {
  const { service } = fixture();
  await rejectsStatus(() => service.createWorkspace(viewer, "Unauthorized workspace", "development"), 403);
});

test("workspace deletion cannot cross tenant boundaries", async () => {
  const { service } = fixture();
  await rejectsStatus(() => service.deleteWorkspace(owner, "workspace-signal"), 404);
  const signal = await service.snapshot({ userId: "user-owner", organizationId: "org-signal" });
  assert.equal(signal.workspaces.some((item) => item.id === "workspace-signal"), true);
});

test("authorized workspace mutations create audit evidence", async () => {
  const { service } = fixture();
  const workspace = await service.createWorkspace(developer, "Prompt lab", "development");
  const snapshot = await service.snapshot(developer);
  assert.equal(snapshot.workspaces.some((item) => item.id === workspace.id), true);
  assert.equal(snapshot.auditEvents[0]?.action, "workspace.created");
  assert.equal(snapshot.auditEvents[0]?.actorUserId, developer.userId);
});

test("API key plaintext is returned once and only its digest remains", async () => {
  const { service, store } = fixture();
  const issued = await service.createApiKey(developer, "CI inference");
  assert.match(issued.secret, /^lk_demo_/);
  const state = await store.read();
  const stored = state.apiKeys.find((item) => item.id === issued.id)!;
  assert.equal(stored.secretHash, createHash("sha256").update(issued.secret).digest("hex"));
  assert.equal(JSON.stringify(await service.snapshot(developer)).includes(issued.secret), false);
  assert.equal(JSON.stringify(await service.snapshot(developer)).includes(stored.secretHash), false);
});

test("API key revocation is tenant-scoped and audited", async () => {
  const { service } = fixture();
  const issued = await service.createApiKey(owner, "Temporary key");
  await service.revokeApiKey(owner, issued.id);
  const snapshot = await service.snapshot(owner);
  assert.ok(snapshot.apiKeys.find((item) => item.id === issued.id)?.revokedAt);
  assert.equal(snapshot.auditEvents[0]?.action, "api_key.revoked");
});

test("usage aggregates never include another organization", async () => {
  const { service, store } = fixture();
  await store.transact((state) => { state.usage.push({ id: "signal-usage", organizationId: "org-signal", userId: "user-owner", provider: "local", model: "signal-model", inputTokens: 999999, outputTokens: 999999, estimatedCostCents: 999999, latencyMs: 1, createdAt: new Date().toISOString() }); });
  const snapshot = await service.snapshot(owner);
  assert.equal(snapshot.usage.some((item) => item.id === "signal-usage"), false);
  assert.ok(snapshot.usageTotals.costCents < 999999);
});

test("developer can meter usage but cannot change billing policy", async () => {
  const { service } = fixture();
  const usage = await service.recordUsage(developer, { provider: "openai", model: "demo-model", inputTokens: 100, outputTokens: 20, estimatedCostCents: 15, latencyMs: 450 });
  assert.equal(usage.organizationId, developer.organizationId);
  await rejectsStatus(() => service.updateBudget(developer, 50000), 403);
  const updated = await service.updateBudget(owner, 50000);
  assert.equal(updated.budgetWarningCents, 50000);
});

test("member invitations validate input and remain organization scoped", async () => {
  const { service } = fixture();
  const invite = await service.invite(owner, " PERSON@EXAMPLE.TEST ", "viewer");
  assert.equal(invite.email, "person@example.test");
  await rejectsStatus(() => service.invite(viewer, "other@example.test", "member"), 403);
  await rejectsStatus(() => service.invite(owner, "not-an-email", "member"), 422);
  await rejectsStatus(() => service.invite(owner, "owner@example.test", "owner"), 422);
});

test("webhook secret is one-time and synthetic delivery persists signed evidence", async () => {
  const { service, store } = fixture();
  const created = await service.createWebhook(developer, "https://hooks.example.invalid/launchkit", ["usage.threshold"]);
  assert.match(created.signingSecret, /^whsec_demo_/);
  const delivery = await service.testWebhook(developer, created.endpoint.id);
  assert.equal(delivery.status, "delivered");
  assert.match(delivery.signaturePreview ?? "", /^sha256=/);
  const state = await store.read();
  const stored = state.webhooks.find((item) => item.id === created.endpoint.id)!;
  assert.equal(stored.secretHash, createHash("sha256").update(created.signingSecret).digest("hex"));
  assert.equal(JSON.stringify(await service.snapshot(developer)).includes(created.signingSecret), false);
  assert.equal(state.jobs[0]?.type, "webhook.delivery");
});

test("webhook URLs require HTTPS", async () => {
  const { service } = fixture();
  await rejectsStatus(() => service.createWebhook(owner, "http://example.invalid/hook", ["usage.threshold"]), 422);
});
