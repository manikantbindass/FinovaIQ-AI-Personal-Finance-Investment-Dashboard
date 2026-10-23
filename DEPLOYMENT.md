# Deployment preparation

No production deployment or paid infrastructure has been created. Complete SECURITY.md and PROGRESS.md before a public financial-data release.

Frontend: Vercel root apps/web, install using repository workspace/lockfile, build `pnpm --filter @finovaiq/web build`. Configure NEXT_PUBLIC_API_URL to the backend HTTPS `/api/v1` URL before building. Vercel manages its port; local web uses 3001.

Backend: repository-root Docker context, `docker build -f apps/api/Dockerfile -t finovaiq-api .`. The Dockerfile binds 4000 on 0.0.0.0 and runs as an unprivileged user. Docker build/runtime have not been verified without an available Linux engine. Alternatively build and run Node on a persistent host. Set NODE_ENV=production, HOST=0.0.0.0, PORT, DATABASE_URL, WEB_ORIGIN, SMTP_URL and MAIL_FROM using the host's secrets store. Do not bake `.env` into images.

Database: managed PostgreSQL with TLS/private networking, least-privilege application credentials and encrypted backups. Apply `pnpm db:migrate` as a release step; never seed demo users in production. Verify `/api/v1/health`. Configure trusted proxies deliberately before honoring client-IP forwarding; arbitrary proxy headers are not trusted by current code.

Use same-site custom HTTPS domains (app.example.com/api.example.com) or an API proxy. Current Lax session cookies do not support unrelated cross-site domains. WEB_ORIGIN must exactly match the web origin. Do not simply weaken cookie/CSRF protections for vercel.app-to-unrelated-domain hosting.

Optional AI: build apps/ai, run privately on 8000, configure OPENAI_API_KEY, supported OPENAI_MODEL and a strong AI_SERVICE_TOKEN. API uses matching AI_SERVICE_TOKEN, AI_MODE=live and AI_SERVICE_URL. Python receives no database credentials. Live mode is implemented but not credential-verified; generation currently completes before SSE delivery. Redis is provisioned but no workers/cache need deployment yet. Payments are disabled.

Staging must have separate database, origins, test SMTP mailbox and secrets. Test migrations against a restored staging copy, complete browser/security/load/restore checks, and obtain release approval. Use immutable image tags keyed to commit. Roll back application images to known-good builds; database recovery requires a compatible forward migration or a verified backup restore. Never force-reset Git history or delete live volumes as rollback.
