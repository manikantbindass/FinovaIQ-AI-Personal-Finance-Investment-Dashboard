# Deployment preparation

## Hosted demonstration

- Application: **https://finovaiq.vercel.app**
- API health: https://finovaiq-api.vercel.app/api/v1/health
- API documentation: https://finovaiq-api.vercel.app/api/docs
- Opening the API root redirects to the configured frontend (`WEB_ORIGIN`); use the application link for the dashboard.
- Frontend/API: Vercel Hobby, dedicated finovaiq and finovaiq-api projects.
- Database: dedicated finovaiq-demo-db, Neon free_v3, Singapore region.

The frontend uses a same-origin proxy to preserve Secure/HttpOnly/SameSite session cookies. The hosted copilot uses explicit deterministic demo mode; it does not call a paid AI provider. New-user email registration requires SMTP configuration and is not enabled for this shared demo. The published fixture account is verified and contains only fictional records. Existing unrelated Vercel projects were preserved.

The NestJS executable entrypoint directly imports NestFactory. Its reusable configuration lives in application.ts, since Vercel otherwise detects app.ts as an executable entrypoint. The fictional seed uses a bounded 60-second transaction timeout for hosted database latency. Secrets and runtime state are excluded from uploads by .vercelignore and from Git by .gitignore.

## Vercel deployment request (2026-10-23)

The owner authorized Vercel hosting. Authenticated Vercel access and hosted PostgreSQL are now configured for the isolated demonstration described above. Local PostgreSQL cannot be used by Vercel. Do not publish a frontend configured to call localhost.

Deploy two Vercel projects from this repository, with root directories `apps/api` (NestJS) and `apps/web` (Next.js). Each root contains a vercel.json with its framework and build commands. The API's existing `src/main.ts` entry point matches [Vercel's supported NestJS entry points](https://vercel.com/docs/frameworks/backend/nestjs). Use Node 24 and the committed pnpm lockfile. Include repository files outside each root for workspace dependency resolution.

API environment: DATABASE_URL (hosted PostgreSQL with TLS, preferably pooled), WEB_ORIGIN (exact frontend HTTPS origin), NODE_ENV=production, AI_MODE=demo, and HOST=0.0.0.0. Configure SMTP_URL/MAIL_FROM before enabling new-user registration. Apply migrations in a release/maintenance step, not every function invocation. Keep credentials in Vercel's environment settings, never in source or CLI arguments.

Web environment: API_PROXY_URL is the deployed HTTPS API **origin** (no `/api/v1` suffix); NEXT_PUBLIC_API_URL should be omitted or `/api/v1`. The web app rewrites `/api/v1/*` to the fixed server-side API origin. Session cookies are then first-party on the frontend domain, retaining HttpOnly/Secure/SameSite=Lax protection. WEB_ORIGIN on the API must match the frontend origin. Set a stable frontend domain for authenticated testing; separate preview domains need their own matching API environment.

For a public demonstration, use a separate database containing only synthetic records. The existing local fixture account is demo@finovaiq.test / FinovaDemo2026! and must not be copied together with any real user data. The seed script still refuses NODE_ENV=production; provision a dedicated demonstration database during an explicit non-production maintenance step. A public demo account is shared and editable by anyone with its published password.

Verify the deployed `/api/v1/health` through the frontend, login, record persistence, logout and copilot before reporting the deployment as functional. No Vercel URL is claimed until a successful deployment and browser check. Do not purchase hosting/database plans without the owner's authorization.

No paid infrastructure has been created. Complete SECURITY.md and PROGRESS.md before a public release that accepts real financial data.

Frontend: Vercel root apps/web, install using repository workspace/lockfile, build `pnpm --filter @finovaiq/web build`. Configure the server-only API_PROXY_URL to the backend HTTPS origin before building. Leave NEXT_PUBLIC_API_URL unset or `/api/v1`. Vercel manages its port; local web uses 3001.

Backend: repository-root Docker context, `docker build -f apps/api/Dockerfile -t finovaiq-api .`. The Dockerfile binds 4000 on 0.0.0.0 and runs as an unprivileged user. Docker build/runtime have not been verified without an available Linux engine. Alternatively build and run Node on a persistent host. Set NODE_ENV=production, HOST=0.0.0.0, PORT, DATABASE_URL, WEB_ORIGIN, SMTP_URL and MAIL_FROM using the host's secrets store. Do not bake `.env` into images.

Database: managed PostgreSQL with TLS/private networking, least-privilege application credentials and encrypted backups. Apply `pnpm db:migrate` as a release step; never seed demo users in production. Verify `/api/v1/health`. Configure trusted proxies deliberately before honoring client-IP forwarding; arbitrary proxy headers are not trusted by current code.

The implemented API proxy keeps browser API requests and session cookies on the frontend's origin, including when the API has a different vercel.app hostname. Direct browser calls to unrelated backend domains are not supported by the Lax cookie policy. WEB_ORIGIN must exactly match the web origin. Keep cookie/CSRF protections intact.

Optional AI: build apps/ai, run privately on 8000, configure OPENAI_API_KEY, supported OPENAI_MODEL and a strong AI_SERVICE_TOKEN. API uses matching AI_SERVICE_TOKEN, AI_MODE=live and AI_SERVICE_URL. Python receives no database credentials. Live mode is implemented but not credential-verified; generation currently completes before SSE delivery. Redis is provisioned but no workers/cache need deployment yet. Payments are disabled.

Staging must have separate database, origins, test SMTP mailbox and secrets. Test migrations against a restored staging copy, complete browser/security/load/restore checks, and obtain release approval. Use immutable image tags keyed to commit. Roll back application images to known-good builds; database recovery requires a compatible forward migration or a verified backup restore. Never force-reset Git history or delete live volumes as rollback.
