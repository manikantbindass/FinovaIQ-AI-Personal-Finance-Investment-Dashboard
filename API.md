# API v1

Base: `http://localhost:4000/api/v1`. Swagger: `/api/docs`; JSON: `/api/docs-json`. Route discovery is generated; Zod body schemas are documented here rather than auto-generated in Swagger.

Unsafe requests require the exact configured Origin (local: `http://localhost:3001`). Financial endpoints require the HttpOnly finovaiq_session cookie. Ownership always comes from the session. POST returns 201; GET/PATCH/DELETE return 200. Error shape: `{error:{status,message}}`.

Money inputs are decimal rupee strings (12 whole digits, 2 decimals maximum); outputs are integer paise strings. Quantities are decimal strings with up to 8 decimal places. IDs are UUIDs; dates YYYY-MM-DD (2000–2099); months YYYY-MM. Transaction pages contain 20 rows.

| Method | Route | Body / query |
|---|---|---|
| GET | /health | Public database health |
| POST | /auth/register | name,email,password (12–72 characters, letters/numbers) |
| POST | /auth/login | email,password |
| GET | /auth/me | Safe profile |
| POST | /auth/logout | Revoke current session |
| POST | /auth/forgot-password | email; generic response, dev-only resetLink |
| POST | /auth/reset-password | token,password; revokes sessions |
| POST | /auth/verify | token; one-time use |
| PATCH | /users/me | name |
| GET | /categories | Shared read-only catalog |
| GET / POST | /accounts | Create: name,type?,openingBalance?; BANK/CASH/SAVINGS |
| GET | /transactions | page,search,month,kind,categoryId,sort=asc/desc |
| POST | /transactions | accountId,categoryId,amount,kind,merchant,date,recurring?,note? |
| PATCH | /transactions/:id | Full create body; transfers cannot be edited |
| DELETE | /transactions/:id | Removes both sides if a transfer |
| POST | /transactions/import | accountId,csv; returns imported/duplicates |
| POST | /transfers | from,to,amount,date; atomic, owned accounts only |
| GET / POST | /budgets | GET month; POST categoryId,amount,month (upsert) |
| GET / POST | /goals | Create: name,target,saved?,monthlyContribution?,targetDate |
| PATCH | /goals/:id | Full create body |
| GET / POST | /portfolios | Create: name; calculated holdings in GET |
| POST | /portfolios/:id/trades | symbol,name,kind,quantity,price,fees?,date |
| GET | /analytics/dashboard | month; balances, monthly totals, spending, goals, budgets |
| POST | /analytics/forecast | monthly,initial?,months (1–600) |
| GET | /ai/conversations | Last 20 owned conversations; up to 100 messages each |
| POST | /ai/chat | message,conversationId?; SSE metadata, text chunks, done |
| GET / PATCH | /notifications, /notifications/:id | Last 50 notices / mark read |
| GET | /subscriptions/me | Tier, status, usage |
| GET | /admin/usage | ADMIN only, aggregate counts |

DIVIDEND price means total cash dividend; fees are subtracted; required quantity does not change holdings. BUY/SELL price is per unit. Backdated trades validate the whole chronological history. Trade/goal records do not move bank-account funds. No FX or live valuation is performed.

Demo copilot supports monthly income/spending, largest category, savings and investment cost. Unsupported questions receive an explicit limitation. Python receives only an authorized calculated summary; it has no SQL/command tools. SSE chunks an already generated answer; live token streaming and tool-calling orchestration remain pending. Adapter reference: [official OpenAI Python Responses API](https://developers.openai.com/api/reference/python).

FREE quota: 30 monthly requests; other stored tiers: 200. No paid-upgrade API exists. Current AI failures use 502 for provider/quota/conversation failures; distinguish 429/404 in a future API refinement. Throttling: 90 requests/minute per route/client per API process. Shared limits are pending.
