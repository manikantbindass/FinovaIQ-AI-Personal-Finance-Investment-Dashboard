# Testing

`pnpm test` runs seven accounting/rules tests and three frontend display/button tests. PostgreSQL tests are skipped unless explicitly enabled; a skip is not database verification.

```powershell
$env:RUN_INTEGRATION='1'
pnpm --filter @finovaiq/api test
Remove-Item Env:RUN_INTEGRATION
```

The 14 integration cases use real PostgreSQL, create two unique synthetic users and clean their owned records afterward. Shared test asset rows may remain. Coverage: authentication, single-use verification, password reset/session invalidation, validation, resource ownership, admin restrictions, exact dashboard/budget totals, import idempotency, transfer isolation, holdings/overselling, copilot data authorization/quota, forecasts and logout. Never run against production.

Browser verification: `pnpm build`, `pnpm exec playwright install chromium`, `pnpm test:e2e`. Playwright starts/reuses API 4000 and production frontend 3001. The main workflow registers, creates account/income/expense/budget/portfolio/trade, checks exact totals and authorized copilot output, logs out and logs in. The mobile workflow uses 390px, checks overflow/navigation/theme and axe WCAG A/AA-oriented rules. Browser test users remain in the disposable database for troubleshooting. Reports/traces are ignored and may contain synthetic session credentials; do not publish them.

Python: from apps/ai run `.venv/Scripts/python.exe -m pytest -q` (Unix `.venv/bin/python`). Four cases cover health, service authentication, missing provider credentials and schema rejection. No paid OpenAI calls occur.

Static/build/security checks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm audit --prod --audit-level high`. CI repeats these with PostgreSQL and a separate Python job. Workflow presence does not establish remote success.

Automated axe checks do not replace manual screen-reader/keyboard review. Real OpenAI/SMTP tests require configured credentials. Docker execution needs a working Linux engine. Core Web Vitals and load targets are unmeasured; do not claim performance results.
