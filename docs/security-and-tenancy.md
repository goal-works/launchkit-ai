# Security and tenancy

## Authorization sequence

Every protected request decodes a signed session into a user and active organization. The service then:

1. verifies that the user has a membership in that organization;
2. resolves the membership's current role from durable state;
3. checks the required permission for the operation;
4. finds or mutates resources using both resource ID and organization ID;
5. records tenant-scoped audit evidence for security-relevant mutations.

The client hides unavailable controls for clarity, but route handlers and service methods enforce the same permissions independently.

## Permission profiles

| Role | Access profile |
| --- | --- |
| Owner | All modeled permissions, including billing and audit access |
| Admin | All modeled permissions |
| Developer | Workspaces, usage writes, API keys, and webhooks; no billing or audit administration |
| Member | Read members, keys, workspaces, usage, and webhooks |
| Viewer | Read members, workspaces, usage, and webhooks |

Owner invitations are rejected: ownership is established only by organization creation in V1. Invitation roles are runtime-validated rather than trusted from TypeScript casts or client options.

## Secret handling

- Session cookies are HTTP-only, same-site `Lax`, HMAC signed, and `Secure` in production.
- Non-demo persistence requires an explicit session secret of at least 32 characters.
- API keys use cryptographic random bytes. Plaintext is returned once, while only a SHA-256 digest and identification prefix remain in state.
- Each webhook secret is derived server-side for its endpoint, returned once, and represented in state only by its SHA-256 digest. Delivery signatures use that same secret as the HMAC key.
- Snapshots remove API-key hashes, webhook hashes, and plaintext secrets before they reach the UI.

## Tenant-isolation evidence

Automated tests cover membership rejection, viewer denial, cross-tenant workspace deletion, tenant-filtered usage aggregation, tenant-scoped revocation, audit ownership, and one-time secret handling. Browser tests confirm organization switching changes visible tenant resources and that permission-limited identities cannot reach administrative evidence.

## Deployment work still required

Demo sessions are intentionally not a production authentication system. A real deployment also needs CSRF policy review, rate limiting, key rotation and encrypted recovery strategy, webhook replay protection, external delivery retries, structured security telemetry, dependency scanning, database-level row policies or equivalent defense in depth, and an independent security review.
