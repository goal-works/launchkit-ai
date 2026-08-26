# Architecture

## Request path

```text
Browser
  │ signed HTTP-only session cookie
  ▼
Next.js server components and route handlers
  │ Actor { userId, organizationId }
  ▼
LaunchKitService
  ├── membership lookup
  ├── role → permission authorization
  ├── organization-qualified resource lookup
  └── audit mutation
  ▼
StateStore
  ├── MemoryStore: serialized, process-local demo transactions
  └── PostgresStore: JSONB document + SELECT … FOR UPDATE
```

Webhook tests run inline in zero-service demo mode. With `LAUNCHKIT_INLINE_JOBS=false`, the web process pushes a tenant-bearing job to Redis and the worker applies the same service authorization before recording a synthetic signed delivery.

## Boundaries

- `app/` renders tenant-filtered snapshots and exposes the HTTP boundary.
- `server/service.ts` owns authorization and domain mutations; UI visibility is never the security boundary.
- `server/store.ts` owns transaction serialization and persistence selection.
- `server/security.ts` owns signed sessions, one-time key material, digests, and webhook HMACs.
- `server/jobs.ts` and `server/worker.ts` separate request acceptance from asynchronous work.
- `server/stripe-test.ts` refuses non-test Stripe credentials and is not invoked in the default demo.

## Persistence decision

The PostgreSQL adapter persists one versioned JSONB document. A row lock makes each write atomic and keeps this portfolio implementation concise enough to inspect end to end. The tradeoff is limited query planning, weaker database-level foreign-key enforcement, and a single write-serialization point.

A production evolution should introduce migrations and normalized tables for organizations, memberships, workspaces, keys, usage, audit events, webhook endpoints, deliveries, jobs, and notifications. Tenant identifiers should remain mandatory in every table, index, query, cache key, queue payload, and log field.

## Deliberate demo constraints

- Authentication uses selectable fictional identities, not passwords or an external IdP.
- Webhook delivery is recorded deterministically; it does not send traffic to the displayed `.invalid` endpoints.
- Usage costs are modeled synthetic values, not provider invoices.
- Billing state is seeded; checkout remains unavailable unless Stripe test mode is explicitly configured.
- The in-memory store is intentionally ephemeral.
