# Development

## Requirements

- Node.js 22.13+
- npm
- Docker with Compose for the PostgreSQL/Redis path

## Zero-service mode

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Keep `LAUNCHKIT_DATA_MODE=memory` and `LAUNCHKIT_INLINE_JOBS=true`. State is seeded on process start and intentionally disappears on restart.

## Service-backed mode

```bash
docker compose up --build
curl http://localhost:3003/api/health
```

Compose switches to PostgreSQL, disables inline jobs, and starts a Redis worker. The first database access creates and seeds the singleton state document. Use a unique secret of at least 32 characters outside local demo use.

To run services separately, set:

```dotenv
LAUNCHKIT_DATA_MODE=postgres
LAUNCHKIT_INLINE_JOBS=false
DATABASE_URL=postgresql://launchkit:launchkit@localhost:5433/launchkit
REDIS_URL=redis://localhost:6380
LAUNCHKIT_SESSION_SECRET=replace-with-at-least-32-random-characters
```

## Stripe test adapter

Checkout is deliberately unavailable by default. The adapter accepts only a `sk_test_` key and requires `STRIPE_TEST_PRICE_ID`. Never put a live credential in this demo. The current product UI documents this boundary and does not invoke checkout.

## Useful commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

All seed records are synthetic. Preserve the `.invalid`, `.test`, and demo-domain conventions when extending fixtures.
