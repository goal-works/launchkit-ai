import type { Permission, Role } from "./types";

const allPermissions: Permission[] = [
  "billing:read", "billing:write", "members:read", "members:invite", "members:remove",
  "api_keys:read", "api_keys:create", "api_keys:revoke", "workspace:read",
  "workspace:create", "workspace:delete", "usage:read", "usage:write", "audit:read",
  "webhooks:read", "webhooks:write",
];

export const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(allPermissions),
  admin: new Set(allPermissions),
  developer: new Set([
    "members:read", "api_keys:read", "api_keys:create", "api_keys:revoke",
    "workspace:read", "workspace:create", "workspace:delete", "usage:read", "usage:write",
    "webhooks:read", "webhooks:write",
  ]),
  member: new Set(["members:read", "api_keys:read", "workspace:read", "usage:read", "webhooks:read"]),
  viewer: new Set(["members:read", "workspace:read", "usage:read", "webhooks:read"]),
};
