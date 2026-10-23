# FinovaIQ architecture

FinovaIQ is a pnpm/Turborepo workspace. `apps/web` is a Next.js App Router client. `apps/api` is the trusted NestJS boundary for authentication, authorization, validation, financial calculations and PostgreSQL writes through Prisma. `apps/ai` is an optional Python FastAPI process; it receives only an authorized, calculated summary from the API, never a database connection or browser credential.

The browser uses an opaque HttpOnly cookie. Only SHA-256 session digests are persisted. Every financial query is scoped by the authenticated user ID. Unsafe requests require the configured browser Origin, including login, to prevent cross-site requests. All amounts are integer minor units in PostgreSQL BigInt and JSON strings. The initial product supports INR only; no implicit currency conversion occurs. Portfolio quantities use PostgreSQL Decimal and weighted-average cost basis including fees. Transfers use a single serializable transaction.

PostgreSQL is the source of truth. Redis is provisioned for future queues/caching; it is not required for correctness. Background workers, production payment collection, bank connections, live market prices, and corporate actions are not part of the initial milestone. Avoid advertising them as implemented. Demo mode uses synthetic seeded records and deterministic calculations, never fabricated external API responses.

Layers: Nest controllers validate input and enforce guards; AuthService manages sessions; FinanceService owns persistence and accounting; pure finance functions support unit verification. Atomic database operations protect imports, AI quotas, token use, and trade ordering. Nest's throttler limits requests per process; multi-replica deployment needs a shared store/reverse proxy limit.

Deployment targets: Next.js on Vercel; persistent Node API and optional Python service on a container host; managed PostgreSQL. Set exact HTTPS origins and secrets, apply migrations as a release step, then deploy. Production release requires the remaining work and checks recorded in PROGRESS.md.
