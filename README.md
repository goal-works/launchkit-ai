# LaunchKit AI

Production-oriented multi-tenant infrastructure for AI SaaS products, presented through a fully synthetic inspectable demo.

LaunchKit AI focuses on the control-plane work behind an AI product: tenant boundaries, server-enforced roles, workspaces, API-key lifecycle, usage metering, budget policy, audit evidence, notifications, and signed webhook jobs. It does not call a model, charge a card, or claim production identity-provider integration.

## What is included

- signed, HTTP-only demo sessions and organization switching;
- Owner, Admin, Developer, Member, and Viewer permission profiles;
- server-side membership, permission, tenant, and resource checks;
- invitation, workspace, API-key, usage, budget, audit, and webhook workflows;
- one-time API-key and webhook-secret reveal with digest-only persistence;
- PostgreSQL-backed state transactions and an in-memory zero-service mode;
- Redis-backed webhook jobs, with an inline deterministic development path;
- a guarded Stripe test-mode adapter that rejects live credentials;
- responsive product screens and automated Axe accessibility coverage.

Every identity, organization, email, endpoint, usage record, price, and event in the product is fictional demonstration data.

## Architecture

```text
Browser → Next.js UI + route handlers → tenant service → PostgreSQL
                                           ├── Redis worker
                                           └── Stripe test adapter (optional)
```

The service layer resolves membership and permissions before applying tenant-qualified reads or mutations. See [docs/architecture.md](docs/architecture.md) and [docs/security-and-tenancy.md](docs/security-and-tenancy.md).

## Quick start

LaunchKit requires Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3003`. The default `memory` mode needs no external service and resets when the process restarts.

For the PostgreSQL and Redis workflow:

```bash
docker compose up --build
```

The compose stack starts the web app on port 3003, PostgreSQL on 5433, Redis on 6380, and a separate worker. Replace the included local container secret before any deployment.

## Validation

```bash
npm run validate
npx playwright install chromium
npm run test:e2e
```

The suite contains 13 domain/security tests and 20 Chromium tests covering workflows, tenant switching, permissions, three viewport widths, and serious/critical Axe findings across eight product routes. See [docs/testing.md](docs/testing.md).

## Project structure

```text
app/                  Next.js screens and route-handler API
components/           client actions and shared product shell
server/domain/        types, permission matrix, seed data, errors
server/               service, security, stores, queue, worker, Stripe boundary
server/tests/         domain, tenant-isolation, and secret-lifecycle tests
tests/                Playwright workflow, responsive, and Axe tests
docs/                 architecture, security, development, and testing notes
```

## Production boundary

This is a production-shaped portfolio implementation, not a drop-in hosted service. Before deployment, replace demo authentication with a production identity provider, normalize the JSONB document store into migrated relational tables, add encrypted secret rotation, connect real delivery infrastructure, add observability and rate limits, and complete a security review. Stripe is disabled unless an explicit test key and test price are provided.

## Contributing and license

No contribution policy or license is claimed yet. Add them only after the repository owner selects the terms.
