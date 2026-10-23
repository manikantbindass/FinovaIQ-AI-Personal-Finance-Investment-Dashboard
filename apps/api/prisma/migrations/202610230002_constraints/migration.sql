ALTER TABLE "Transaction" ADD CONSTRAINT "transaction_positive_amount" CHECK ("amount" > 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "transaction_valid_kind" CHECK ("kind" IN ('INCOME','EXPENSE'));
ALTER TABLE "Budget" ADD CONSTRAINT "budget_positive_amount" CHECK ("amount" > 0);
ALTER TABLE "Goal" ADD CONSTRAINT "goal_nonnegative_amounts" CHECK ("target" > 0 AND "saved" >= 0 AND "monthlyContribution" >= 0);
ALTER TABLE "Trade" ADD CONSTRAINT "trade_valid_amounts" CHECK ("quantity" > 0 AND "price" > 0 AND "fees" >= 0);
ALTER TABLE "Trade" ADD CONSTRAINT "trade_valid_kind" CHECK ("kind" IN ('BUY','SELL','DIVIDEND'));
ALTER TABLE "Account" ADD CONSTRAINT "account_inr_only" CHECK ("currency" = 'INR');
ALTER TABLE "Portfolio" ADD CONSTRAINT "portfolio_inr_only" CHECK ("currency" = 'INR');
