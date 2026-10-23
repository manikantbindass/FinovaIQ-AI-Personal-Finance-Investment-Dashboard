export interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  role: string;
}
export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  balance: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: string;
  kind: "INCOME" | "EXPENSE";
  merchant: string;
  date: string;
  recurring: boolean;
  note: string;
  transferId: string | null;
  account: { name: string };
  category: Category;
}
export interface Budget {
  id: string;
  categoryId: string;
  amount: string;
  spent: string;
  month: string;
  category: Category;
}
export interface Goal {
  id: string;
  name: string;
  target: string;
  saved: string;
  monthlyContribution: string;
  targetDate: string;
}
export interface Holding {
  asset: { symbol: string; name: string };
  quantity: string;
  cost: string;
  realized: string;
  dividends: string;
  marketValue: null;
}
export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
  trades: {
    id: string;
    kind: string;
    quantity: string;
    price: string;
    fees: string;
    date: string;
    asset: { symbol: string };
  }[];
}
export interface Dashboard {
  month: string;
  currency: string;
  income: string;
  expenses: string;
  balance: string;
  netCashFlow: string;
  savingsRate: number;
  investmentCost: string;
  netWorthAtCost: string;
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
  recent: Transaction[];
  spending: { name: string; value: string }[];
  cashflow: { date: string; income: string; expenses: string }[];
  insights: string[];
  dataNote: string;
}
export interface Conversation {
  id: string;
  messages: { id: string; role: string; content: string }[];
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  read: boolean;
}
