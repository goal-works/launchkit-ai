export type Role = "owner" | "admin" | "developer" | "member" | "viewer";

export type Permission =
  | "billing:read"
  | "billing:write"
  | "members:read"
  | "members:invite"
  | "members:remove"
  | "api_keys:read"
  | "api_keys:create"
  | "api_keys:revoke"
  | "workspace:read"
  | "workspace:create"
  | "workspace:delete"
  | "usage:read"
  | "usage:write"
  | "audit:read"
  | "webhooks:read"
  | "webhooks:write";

export type User = { id: string; name: string; email: string };
export type Organization = {
  id: string;
  name: string;
  slug: string;
  budgetWarningCents: number;
  subscription: { plan: "starter" | "growth" | "scale"; status: "trialing" | "active" | "past_due" };
};
export type Membership = { id: string; organizationId: string; userId: string; role: Role };
export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<Role, "owner">;
  status: "pending" | "accepted" | "revoked";
  invitedBy: string;
  createdAt: string;
};
export type Workspace = { id: string; organizationId: string; name: string; environment: "development" | "production"; createdAt: string };
export type ApiKeyRecord = {
  id: string;
  organizationId: string;
  name: string;
  prefix: string;
  secretHash: string;
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
};
export type UsageRecord = {
  id: string;
  organizationId: string;
  userId: string;
  provider: "openai" | "anthropic" | "local";
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
  latencyMs: number;
  createdAt: string;
};
export type AuditEvent = {
  id: string;
  organizationId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};
export type WebhookEndpoint = {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  status: "active" | "paused";
  secretHash: string;
  createdAt: string;
};
export type WebhookDelivery = {
  id: string;
  organizationId: string;
  endpointId: string;
  event: string;
  status: "queued" | "delivered" | "failed";
  attempts: number;
  responseCode: number | null;
  durationMs: number | null;
  signaturePreview: string | null;
  createdAt: string;
};
export type BackgroundJob = {
  id: string;
  organizationId: string;
  type: "webhook.delivery" | "usage.rollup";
  status: "queued" | "completed" | "failed";
  attempts: number;
  createdAt: string;
};
export type Notification = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type LaunchKitState = {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  invitations: Invitation[];
  workspaces: Workspace[];
  apiKeys: ApiKeyRecord[];
  usage: UsageRecord[];
  auditEvents: AuditEvent[];
  webhooks: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  jobs: BackgroundJob[];
  notifications: Notification[];
};

export type Actor = { userId: string; organizationId: string };
