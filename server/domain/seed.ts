import type { LaunchKitState, Role } from "./types";

const roles: Role[] = ["owner", "admin", "developer", "member", "viewer"];

export function createSeedState(): LaunchKitState {
  const users = roles.map((role, index) => ({
    id: `user-${role}`,
    name: ["Avery Chen", "Morgan Lee", "Riley Patel", "Jordan Kim", "Casey Brooks"][index]!,
    email: `${role}@launchkit.demo`,
  }));
  const organizations = [
    { id: "org-northstar", name: "Northstar Labs", slug: "northstar", budgetWarningCents: 45000, subscription: { plan: "growth" as const, status: "trialing" as const } },
    { id: "org-signal", name: "Signal Foundry", slug: "signal", budgetWarningCents: 18000, subscription: { plan: "starter" as const, status: "active" as const } },
  ];
  const memberships = roles.map((role) => ({ id: `membership-${role}`, organizationId: "org-northstar", userId: `user-${role}`, role }));
  memberships.push({ id: "membership-owner-signal", organizationId: "org-signal", userId: "user-owner", role: "owner" });
  const usage = Array.from({ length: 12 }, (_, index) => ({
    id: `usage-${index + 1}`,
    organizationId: "org-northstar",
    userId: index % 2 ? "user-developer" : "user-owner",
    provider: index % 3 === 0 ? "anthropic" as const : "openai" as const,
    model: index % 3 === 0 ? "synthetic-reasoner" : "synthetic-chat",
    inputTokens: 18000 + index * 2100,
    outputTokens: 4200 + index * 540,
    estimatedCostCents: 1700 + index * 215,
    latencyMs: 810 + index * 46,
    createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`,
  }));
  return {
    users,
    organizations,
    memberships,
    invitations: [{ id: "invite-1", organizationId: "org-northstar", email: "new.member@launchkit.demo", role: "member", status: "pending", invitedBy: "user-owner", createdAt: "2026-08-18T15:00:00.000Z" }],
    workspaces: [
      { id: "workspace-production", organizationId: "org-northstar", name: "Production agents", environment: "production", createdAt: "2026-07-18T12:00:00.000Z" },
      { id: "workspace-sandbox", organizationId: "org-northstar", name: "Evaluation sandbox", environment: "development", createdAt: "2026-08-02T12:00:00.000Z" },
      { id: "workspace-signal", organizationId: "org-signal", name: "Signal workspace", environment: "production", createdAt: "2026-08-03T12:00:00.000Z" },
    ],
    apiKeys: [{ id: "key-seeded", organizationId: "org-northstar", name: "Production inference", prefix: "lk_demo_7H2K", secretHash: "seeded-non-secret-hash", createdBy: "user-owner", createdAt: "2026-08-04T12:00:00.000Z", revokedAt: null }],
    usage,
    auditEvents: [
      { id: "audit-1", organizationId: "org-northstar", actorUserId: "user-owner", action: "organization.created", targetType: "organization", targetId: "org-northstar", metadata: { synthetic: true }, createdAt: "2026-07-18T12:00:00.000Z" },
      { id: "audit-2", organizationId: "org-northstar", actorUserId: "user-admin", action: "workspace.created", targetType: "workspace", targetId: "workspace-sandbox", metadata: { environment: "development" }, createdAt: "2026-08-02T12:00:00.000Z" },
    ],
    webhooks: [{ id: "webhook-1", organizationId: "org-northstar", url: "https://example.invalid/launchkit-demo", events: ["usage.threshold"], status: "active", secretHash: "seeded-non-secret-hash", createdAt: "2026-08-08T12:00:00.000Z" }],
    deliveries: [{ id: "delivery-1", organizationId: "org-northstar", endpointId: "webhook-1", event: "usage.threshold", status: "delivered", attempts: 1, responseCode: 202, durationMs: 184, signaturePreview: "sha256=demo…", createdAt: "2026-08-20T12:00:00.000Z" }],
    jobs: [{ id: "job-1", organizationId: "org-northstar", type: "usage.rollup", status: "completed", attempts: 1, createdAt: "2026-08-20T12:00:00.000Z" }],
    notifications: [{ id: "notification-1", organizationId: "org-northstar", userId: "user-owner", title: "Budget warning at 75%", body: "Synthetic August usage crossed the configured warning threshold.", read: false, createdAt: "2026-08-21T12:00:00.000Z" }],
  };
}
