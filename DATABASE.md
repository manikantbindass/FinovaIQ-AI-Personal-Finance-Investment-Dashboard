# Database

Schema: `apps/api/prisma/schema.prisma`; SQL history: `apps/api/prisma/migrations`. Deploy with `pnpm db:migrate`. Do not use schema push on production.

Models: User, Session, AuthToken, Account, Category, Transaction, Budget, Goal, Portfolio, Asset, Trade, MarketPrice, Conversation, Message, Notification, Subscription, AuditLog. Owned resources use UUIDs, shared categories stable IDs. Transactions have a composite account/user foreign key. User deletion cascades owned records. Unique constraints cover emails, token hashes, category/month budgets, symbols and user/import hashes. Indexes cover ownership/date/category and session expiry.

Amounts are BigInt paise. Quantities Decimal(20,8); calculations use 48-digit precision and half-up rounding to paise. Weighted-average cost includes buy fees; sale fees reduce proceeds; dividends are separate. SQL constraints enforce positive amounts, valid kinds, nonnegative goal balances/fees and INR-only accounts/portfolios. Overdrafts after transactions are allowed; goals are informational, not a bank ledger.

Transactions protect transfer pairs, money-write/audit operations, imports, token consumption and quotas. Transfers and trades use serializable isolation; conflicts return retryable 409. CSV imports hash user/account/date/normalized merchant/amount/kind and skip duplicates. Manual duplicate suggestions and bank-provided transaction IDs are future work. Seed is idempotent and refuses production.

## Backup and restore

Run `pg_dump --format=custom --file=finovaiq.dump "$DATABASE_URL"` in a secure terminal with PostgreSQL tools. Encrypt backups and store them outside source control with restricted access. Restore into a new empty database using `pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" finovaiq.dump`. Validate schema compatibility, record counts and known accounting totals before switching traffic. Never commit dumps or use volume deletion as recovery. A restore drill has not been executed.
