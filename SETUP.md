# Setup and troubleshooting

Install Node 24+ and pnpm 11.25.0 (`npm install -g pnpm@11.25.0`). At repository root run `pnpm install --frozen-lockfile`, copy `.env.example` to `apps/api/.env`, then start the database and migrate/seed as shown in README.md. Unix uses `cp` instead of `Copy-Item`.

Docker: `docker --context desktop-linux compose up -d postgres redis` (omit context when your default is already Linux). The fallback `pnpm db:local` runs real PostgreSQL bound to 127.0.0.1, storing files in ignored `.local/postgres`. It uses the local-only password in `.env.example`. Never use this fallback for production.

Start web/API with `pnpm dev`. Stop with Ctrl+C. Stop Docker services with `docker compose stop` and resume with `docker compose start`. Ctrl+C stops the fallback while retaining records. Restart API after editing `.env`. Do not delete data volumes to troubleshoot.

## Optional AI service

```powershell
python -m venv apps/ai/.venv
apps/ai/.venv/Scripts/python.exe -m pip install -r apps/ai/requirements.lock.txt
cd apps/ai
.venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Unix uses `.venv/bin/python`. Health works without credentials. For live mode configure AI_MODE=live and AI_SERVICE_URL in the API; set matching randomly generated AI_SERVICE_TOKEN values (24+ characters) in both processes. Set OPENAI_API_KEY and a supported OPENAI_MODEL in Python's environment. Restart both. Keys stay server-side. Demo mode needs no Python process. Docker alternative: `docker compose --profile ai up -d ai` with secrets securely supplied.

Development returns local email verification/reset links for testing. Settings exposes the verification link after registration; recovery shows the reset link. Production hides those links and requires SMTP_URL/MAIL_FROM. Production login rejects unverified users.

## Common issues

- Health 503: check DATABASE_URL and PostgreSQL startup. Docker diagnostics: `docker compose logs postgres redis`; ensure Linux containers are enabled.
- Origin 403: WEB_ORIGIN must exactly match the browser origin including port. Local web uses 3001 because Grafana occupies 3000. To change it, update web scripts, WEB_ORIGIN and Playwright URLs together.
- Windows sandbox pnpm-store errors: use a normal terminal with access to the pnpm store.
- Import columns: `date,merchant,amount,kind` and optional categoryId. Dates are ISO; amounts decimal rupees; kinds INCOME/EXPENSE. Maximum 1,000 rows. Identical same-account/date/merchant/amount/type rows are skipped on reimport; identical legitimate payments can be entered manually.
- Do not start Docker PostgreSQL and the fallback on the same port.

GitHub reauthentication: `gh auth login -h github.com`, `gh auth setup-git`, then `git push origin main`. Never paste tokens into source, shell arguments or chat. Never force-push.
