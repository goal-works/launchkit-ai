# Testing

## Static and production validation

```bash
npm run validate
```

This runs ESLint, TypeScript, 13 Node test-runner cases through `tsx`, and the optimized Next.js build.

## Browser validation

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright starts the production server in memory/inline-job mode. The 20 tests cover:

- protected-route redirects and signed demo login;
- tenant-scoped dashboard evidence and organization switching;
- Viewer permission boundaries;
- invitation, workspace, API-key, budget, and webhook workflows;
- one-time key and signing-secret reveal behavior;
- layout overflow at 375, 768, and 1440 pixels;
- serious and critical Axe findings on all eight product routes.

## Domain and isolation coverage

The service suite exercises session tamper rejection, independent membership validation, owner membership creation, permission denial, cross-tenant resource protection, audit creation, API-key digest persistence and revocation, usage isolation, billing permissions, invitation validation, webhook digest/signature evidence, and HTTPS endpoint validation.

Tests construct a fresh `MemoryStore` fixture so mutation cases remain deterministic. Browser tests run serially against one freshly started demo process because they intentionally exercise full stateful workflows.

## Container validation

When Docker is available, validate the service-backed path with:

```bash
docker compose config
docker compose up --build --wait
curl --fail http://localhost:3003/api/health
docker compose down
```

The expected health payload reports `dataMode` as `postgres`.
