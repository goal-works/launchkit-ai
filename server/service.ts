import { createHash, randomUUID } from "node:crypto";

import { DomainError } from "./domain/errors";
import { rolePermissions } from "./domain/permissions";
import type { Actor, LaunchKitState, Permission, Role } from "./domain/types";
import { deriveWebhookSecret, issueSecret, webhookSignature } from "./security";
import type { StateStore } from "./store";

const now = () => new Date().toISOString();
const cleanName = (value: string, label: string) => {
  const cleaned = value.trim();
  if (cleaned.length < 2 || cleaned.length > 120) throw new DomainError(422, `${label} must be 2-120 characters`);
  return cleaned;
};

export class LaunchKitService {
  constructor(private readonly store: StateStore) {}

  private membership(state: LaunchKitState, actor: Actor) {
    const membership = state.memberships.find((item) => item.userId === actor.userId && item.organizationId === actor.organizationId);
    if (!membership) throw new DomainError(403, "No membership for this organization");
    return membership;
  }

  private authorize(state: LaunchKitState, actor: Actor, permission: Permission) {
    const membership = this.membership(state, actor);
    if (!rolePermissions[membership.role].has(permission)) throw new DomainError(403, `Missing permission: ${permission}`);
    return membership;
  }

  private audit(state: LaunchKitState, actor: Actor, action: string, targetType: string, targetId: string, metadata: Record<string, string | number | boolean> = {}) {
    state.auditEvents.unshift({ id: randomUUID(), organizationId: actor.organizationId, actorUserId: actor.userId, action, targetType, targetId, metadata, createdAt: now() });
  }

  async users() {
    return (await this.store.read()).users;
  }

  async organizationsForUser(userId: string) {
    const state = await this.store.read();
    const ids = new Set(state.memberships.filter((item) => item.userId === userId).map((item) => item.organizationId));
    return state.organizations.filter((item) => ids.has(item.id));
  }

  async validateActor(actor: Actor) {
    const state = await this.store.read();
    const membership = this.membership(state, actor);
    const user = state.users.find((item) => item.id === actor.userId)!;
    const organization = state.organizations.find((item) => item.id === actor.organizationId)!;
    return { user, organization, membership, permissions: [...rolePermissions[membership.role]] };
  }

  async createOrganization(userId: string, name: string) {
    return this.store.transact((state) => {
      const user = state.users.find((item) => item.id === userId);
      if (!user) throw new DomainError(401, "Unknown demo identity");
      const organizationName = cleanName(name, "Organization name");
      const id = randomUUID();
      const slug = `${organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${id.slice(0, 4)}`;
      state.organizations.push({ id, name: organizationName, slug, budgetWarningCents: 25000, subscription: { plan: "starter", status: "trialing" } });
      state.memberships.push({ id: randomUUID(), organizationId: id, userId, role: "owner" });
      const actor = { userId, organizationId: id };
      this.audit(state, actor, "organization.created", "organization", id, { synthetic: true });
      return state.organizations.at(-1)!;
    });
  }

  async snapshot(actor: Actor) {
    const state = await this.store.read();
    const membership = this.membership(state, actor);
    const organization = state.organizations.find((item) => item.id === actor.organizationId)!;
    const members = state.memberships.filter((item) => item.organizationId === actor.organizationId).map((item) => ({ ...item, user: state.users.find((user) => user.id === item.userId)! }));
    const usage = state.usage.filter((item) => item.organizationId === actor.organizationId);
    const usageTotals = usage.reduce((totals, item) => ({ inputTokens: totals.inputTokens + item.inputTokens, outputTokens: totals.outputTokens + item.outputTokens, costCents: totals.costCents + item.estimatedCostCents }), { inputTokens: 0, outputTokens: 0, costCents: 0 });
    return {
      actor: { user: state.users.find((item) => item.id === actor.userId)!, membership, permissions: [...rolePermissions[membership.role]] },
      organization,
      organizations: state.organizations.filter((org) => state.memberships.some((item) => item.userId === actor.userId && item.organizationId === org.id)),
      members,
      invitations: state.invitations.filter((item) => item.organizationId === actor.organizationId),
      workspaces: state.workspaces.filter((item) => item.organizationId === actor.organizationId),
      apiKeys: state.apiKeys.filter((item) => item.organizationId === actor.organizationId).map((item) => ({ id: item.id, organizationId: item.organizationId, name: item.name, prefix: item.prefix, createdBy: item.createdBy, createdAt: item.createdAt, revokedAt: item.revokedAt })),
      usage,
      usageTotals,
      auditEvents: state.auditEvents.filter((item) => item.organizationId === actor.organizationId),
      webhooks: state.webhooks.filter((item) => item.organizationId === actor.organizationId).map((item) => ({ id: item.id, organizationId: item.organizationId, url: item.url, events: item.events, status: item.status, createdAt: item.createdAt })),
      deliveries: state.deliveries.filter((item) => item.organizationId === actor.organizationId),
      jobs: state.jobs.filter((item) => item.organizationId === actor.organizationId),
      notifications: state.notifications.filter((item) => item.organizationId === actor.organizationId && item.userId === actor.userId),
    };
  }

  async invite(actor: Actor, email: string, role: Role) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "members:invite");
      const normalized = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new DomainError(422, "A valid invitation email is required");
      if (!(["admin", "developer", "member", "viewer"] as Role[]).includes(role)) throw new DomainError(422, "Invitation role must be admin, developer, member, or viewer");
      const invitationRole = role as Exclude<Role, "owner">;
      const invitation = { id: randomUUID(), organizationId: actor.organizationId, email: normalized, role: invitationRole, status: "pending" as const, invitedBy: actor.userId, createdAt: now() };
      state.invitations.push(invitation);
      this.audit(state, actor, "member.invited", "invitation", invitation.id, { email: normalized, role });
      return invitation;
    });
  }

  async createWorkspace(actor: Actor, name: string, environment: "development" | "production") {
    return this.store.transact((state) => {
      this.authorize(state, actor, "workspace:create");
      const workspace = { id: randomUUID(), organizationId: actor.organizationId, name: cleanName(name, "Workspace name"), environment, createdAt: now() };
      state.workspaces.push(workspace);
      this.audit(state, actor, "workspace.created", "workspace", workspace.id, { environment });
      return workspace;
    });
  }

  async deleteWorkspace(actor: Actor, id: string) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "workspace:delete");
      const index = state.workspaces.findIndex((item) => item.id === id && item.organizationId === actor.organizationId);
      if (index < 0) throw new DomainError(404, "Workspace not found in this organization");
      state.workspaces.splice(index, 1);
      this.audit(state, actor, "workspace.deleted", "workspace", id);
    });
  }

  async createApiKey(actor: Actor, name: string) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "api_keys:create");
      const issued = issueSecret("lk_demo");
      const record = { id: randomUUID(), organizationId: actor.organizationId, name: cleanName(name, "Key name"), prefix: issued.preview, secretHash: issued.hash, createdBy: actor.userId, createdAt: now(), revokedAt: null };
      state.apiKeys.push(record);
      this.audit(state, actor, "api_key.created", "api_key", record.id, { prefix: record.prefix });
      return { id: record.id, secret: issued.secret, prefix: record.prefix };
    });
  }

  async revokeApiKey(actor: Actor, id: string) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "api_keys:revoke");
      const record = state.apiKeys.find((item) => item.id === id && item.organizationId === actor.organizationId);
      if (!record) throw new DomainError(404, "API key not found in this organization");
      record.revokedAt = now();
      this.audit(state, actor, "api_key.revoked", "api_key", id, { prefix: record.prefix });
    });
  }

  async recordUsage(actor: Actor, input: { provider: "openai" | "anthropic" | "local"; model: string; inputTokens: number; outputTokens: number; estimatedCostCents: number; latencyMs: number }) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "usage:write");
      for (const value of [input.inputTokens, input.outputTokens, input.estimatedCostCents, input.latencyMs]) if (!Number.isFinite(value) || value < 0) throw new DomainError(422, "Usage values must be non-negative numbers");
      const record = { id: randomUUID(), organizationId: actor.organizationId, userId: actor.userId, ...input, model: cleanName(input.model, "Model"), createdAt: now() };
      state.usage.push(record);
      return record;
    });
  }

  async updateBudget(actor: Actor, budgetWarningCents: number) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "billing:write");
      if (!Number.isInteger(budgetWarningCents) || budgetWarningCents < 1000 || budgetWarningCents > 10_000_000) throw new DomainError(422, "Budget warning must be between $10 and $100,000");
      const organization = state.organizations.find((item) => item.id === actor.organizationId)!;
      organization.budgetWarningCents = budgetWarningCents;
      this.audit(state, actor, "billing.budget_updated", "organization", organization.id, { budgetWarningCents });
      return organization;
    });
  }

  async createWebhook(actor: Actor, url: string, events: string[]) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "webhooks:write");
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new DomainError(422, "A valid webhook URL is required"); }
      if (parsed.protocol !== "https:") throw new DomainError(422, "Webhook URLs must use HTTPS");
      if (!events.length) throw new DomainError(422, "Select at least one event");
      const id = randomUUID();
      const signingSecret = deriveWebhookSecret(id);
      const secretHash = createHash("sha256").update(signingSecret).digest("hex");
      const endpoint = { id, organizationId: actor.organizationId, url: parsed.toString(), events: [...new Set(events)], status: "active" as const, secretHash, createdAt: now() };
      state.webhooks.push(endpoint);
      this.audit(state, actor, "webhook.created", "webhook", endpoint.id, { url: endpoint.url });
      return { endpoint: { ...endpoint, secretHash: undefined }, signingSecret };
    });
  }

  async testWebhook(actor: Actor, endpointId: string) {
    return this.store.transact((state) => {
      this.authorize(state, actor, "webhooks:write");
      const endpoint = state.webhooks.find((item) => item.id === endpointId && item.organizationId === actor.organizationId);
      if (!endpoint) throw new DomainError(404, "Webhook not found in this organization");
      const payload = JSON.stringify({ event: "launchkit.test", organizationId: actor.organizationId, synthetic: true });
      const signature = webhookSignature(payload, endpoint.id);
      const job = { id: randomUUID(), organizationId: actor.organizationId, type: "webhook.delivery" as const, status: "completed" as const, attempts: 1, createdAt: now() };
      const delivery = { id: randomUUID(), organizationId: actor.organizationId, endpointId, event: "launchkit.test", status: "delivered" as const, attempts: 1, responseCode: 202, durationMs: 160, signaturePreview: `${signature.slice(0, 18)}…`, createdAt: now() };
      state.jobs.unshift(job);
      state.deliveries.unshift(delivery);
      this.audit(state, actor, "webhook.test_delivered", "webhook", endpointId, { responseCode: 202, synthetic: true });
      return delivery;
    });
  }
}
