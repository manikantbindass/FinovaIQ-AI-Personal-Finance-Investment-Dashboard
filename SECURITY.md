# Security status

This development milestone requires independent review before storing real financial data publicly.

Implemented: bcrypt cost-12 password hashes; random 256-bit tokens stored as SHA-256 digests; HttpOnly/SameSite=Lax cookies (Secure in production); session-derived ownership; strict Zod validation; parameterized Prisma queries; Origin checks on unsafe methods; exact-origin CORS; Helmet API headers; browser frame/content-type/referrer protections; route rate limits; admin role checks; transactional audit records for transaction/transfer/import/trade operations; safe generic server errors; CSV export formula escaping; service-token authentication for Python; no model SQL or execution tools.

Email links expire in one hour and are single-use. Password reset revokes sessions. Development deliberately returns links for testing; production hides links and requires SMTP. Sessions expire in seven days. Expired database rows are rejected but cleanup jobs are pending. Application logs exclude financial bodies, cookies, passwords, tokens and keys.

Secrets belong in ignored `.env` files or secret stores. Public demo credentials are synthetic fixtures for the owner's authorized, isolated hosted demonstration. Remove those fixtures before any release that accepts real financial data. The fallback PostgreSQL server binds only to loopback and stores ignored `.local` files; use it only for development.

Before production: threat-model and independently review; configure HTTPS/SMTP and unique secrets; add account-level login protections, MFA, session management, email resend and shared rate limits; add retention, deletion/export and tested encrypted backups; broaden audit coverage; add request IDs, observability and alerting; add strict Next.js CSP compatible with runtime scripts; conduct manual accessibility, load and restore tests. Revisit verification enforcement for production financial access.

Use same-site HTTPS domains (app.example.com and api.example.com) or an API proxy. Current Lax cookies deliberately do not support unrelated cross-site hosting. Do not weaken Origin/CSRF policy to work around deployment configuration. No real bank credential storage or commercial compliance approval is implied. Review market-data licensing before integration.

Report vulnerabilities privately to the repository owner. Never include user records or tokens in public issues. Dependency scanning is configured in CI; actual results are recorded in PROGRESS.md.
