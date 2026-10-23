"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Download,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  Pencil,
  Send,
  Upload,
  Check,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError, API, post, formatMoney, rupees } from "@/lib/api";
import type {
  Account,
  Budget,
  Category,
  Conversation,
  Dashboard,
  Goal,
  Notice,
  Portfolio,
  Transaction,
  User,
} from "@/lib/types";
import { useUI } from "@/lib/store";
import { AuthScreen } from "./auth-screen";
import { Button } from "./ui/button";
import { DialogForm, type Field } from "./dialog-form";
import { CashflowChart, SpendingChart } from "./charts";

const navigation: { title: string; icon: LucideIcon }[] = [
  { title: "Overview", icon: LayoutDashboard },
  { title: "Transactions", icon: ArrowLeftRight },
  { title: "Accounts", icon: Wallet },
  { title: "Budgets", icon: CreditCard },
  { title: "Portfolio", icon: TrendingUp },
  { title: "Goals", icon: Flag },
  { title: "AI Copilot", icon: Sparkles },
  { title: "Forecast", icon: ChartNoAxesCombined },
];
type Dialog = {
  title: string;
  fields: Field[];
  submit: (v: Record<string, string>) => Promise<void>;
};
const today = () => new Date().toISOString().slice(0, 10);
const amountField = (
  name = "amount",
  label = "Amount (₹)",
  value?: string,
): Field => ({ name, label, type: "number", min: "0.01", step: "0.01", value });
const dateField = (value = today()): Field => ({
  name: "date",
  label: "Date",
  type: "date",
  value,
  min: "2000-01-01",
  max: "2099-12-31",
});
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Wallet size={24} />
      </div>
      <p>{children}</p>
    </div>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Progress toward target"
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        className={value > 100 ? "over" : ""}
      />
    </div>
  );
}
function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Workspace() {
  const client = useQueryClient();
  const { section, setSection, mobileOpen, setMobileOpen } = useUI();
  const reduced = useReducedMotion();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [light, setLight] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    const saved = localStorage.getItem("finovaiq-theme") === "light";
    setLight(saved);
    document.documentElement.dataset.theme = saved ? "light" : "dark";
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const user = useQuery({
    queryKey: ["user"],
    queryFn: () => api<User>("/auth/me"),
  });
  const enabled = Boolean(user.data);
  const dashboard = useQuery({
    queryKey: ["dashboard", month],
    queryFn: () => api<Dashboard>(`/analytics/dashboard?month=${month}`),
    enabled,
  });
  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<Account[]>("/accounts"),
    enabled,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
    enabled,
  });
  const transactions = useQuery({
    queryKey: ["transactions", month, debounced, page],
    queryFn: () =>
      api<{ items: Transaction[]; page: number; pages: number; total: number }>(
        `/transactions?month=${month}&search=${encodeURIComponent(debounced)}&page=${page}`,
      ),
    enabled: enabled && section === "Transactions",
  });
  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api<Portfolio[]>("/portfolios"),
    enabled: enabled && section === "Portfolio",
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Notice[]>("/notifications"),
    enabled: enabled && noticesOpen,
  });
  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: () =>
      api<{
        tier: string;
        status: string;
        aiUsage: number;
        usageMonth: string;
      }>("/subscriptions/me"),
    enabled: enabled && section === "Settings",
  });
  const logout = useMutation({
    mutationFn: () => post("/auth/logout", {}),
    onSuccess: () => {
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "user",
      });
      client.setQueryData(["user"], null);
      void user.refetch();
      setSection("Overview");
    },
    onError: (e) => setToast(e.message),
  });
  async function refresh() {
    await client.cancelQueries();
    await client.invalidateQueries();
  }
  const request = async (path: string, data: unknown, method = "POST") => {
    await api(path, { method, body: JSON.stringify(data) });
    setToast("Saved to your workspace");
    await refresh();
  };
  const categoryOptions = (categories.data ?? [])
    .filter((c) => c.id !== "transfer")
    .map((c) => ({ value: c.id, label: c.name }));
  const accountOptions = (accounts.data ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));
  function openAccount() {
    setDialog({
      title: "Add an account",
      fields: [
        { name: "name", label: "Account name" },
        {
          name: "type",
          label: "Account type",
          options: [
            { value: "BANK", label: "Bank account" },
            { value: "SAVINGS", label: "Savings account" },
            { value: "CASH", label: "Cash" },
          ],
        },
        {
          ...amountField("openingBalance", "Opening balance (₹)", "0"),
          min: "0",
        },
      ],
      submit: (v) => request("/accounts", v),
    });
  }
  function openTransaction(t?: Transaction) {
    if (!accountOptions.length) {
      setToast("Create an account before adding transactions");
      openAccount();
      return;
    }
    setDialog({
      title: t ? "Edit transaction" : "Add a transaction",
      fields: [
        {
          name: "merchant",
          label: "Merchant or description",
          value: t?.merchant,
        },
        {
          name: "kind",
          label: "Transaction type",
          value: t?.kind,
          options: [
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ],
        },
        amountField("amount", "Amount (₹)", t ? rupees(t.amount) : undefined),
        {
          name: "accountId",
          label: "Account",
          options: accountOptions,
          value: t?.accountId,
        },
        {
          name: "categoryId",
          label: "Category",
          options: categoryOptions,
          value: t?.categoryId,
        },
        dateField(t?.date.slice(0, 10)),
        {
          name: "recurring",
          label: "Recurring payment",
          value: t?.recurring ? "true" : "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
        {
          name: "note",
          label: "Note (optional)",
          required: false,
          value: t?.note,
        },
      ],
      submit: (v) =>
        request(
          t ? `/transactions/${t.id}` : "/transactions",
          { ...v, recurring: v.recurring === "true" },
          t ? "PATCH" : "POST",
        ),
    });
  }
  function openBudget() {
    setDialog({
      title: "Set a monthly budget",
      fields: [
        { name: "categoryId", label: "Category", options: categoryOptions },
        amountField(),
        { name: "month", label: "Month", type: "month", value: month },
      ],
      submit: (v) => request("/budgets", v),
    });
  }
  function openGoal(g?: Goal) {
    setDialog({
      title: g ? "Update your goal" : "Create a goal",
      fields: [
        { name: "name", label: "Goal name", value: g?.name },
        amountField(
          "target",
          "Target amount (₹)",
          g ? rupees(g.target) : undefined,
        ),
        {
          ...amountField(
            "saved",
            "Amount saved (₹)",
            g ? rupees(g.saved) : "0",
          ),
          min: "0",
        },
        {
          ...amountField(
            "monthlyContribution",
            "Monthly contribution (₹)",
            g ? rupees(g.monthlyContribution) : "0",
          ),
          min: "0",
        },
        {
          name: "targetDate",
          label: "Target date",
          type: "date",
          value: g?.targetDate.slice(0, 10),
          min: "2000-01-01",
          max: "2099-12-31",
        },
      ],
      submit: (v) =>
        request(g ? `/goals/${g.id}` : "/goals", v, g ? "PATCH" : "POST"),
    });
  }
  function openPortfolio() {
    setDialog({
      title: "Create a portfolio",
      fields: [{ name: "name", label: "Portfolio name" }],
      submit: (v) => request("/portfolios", v),
    });
  }
  function openTrade(id: string) {
    setDialog({
      title: "Record an investment",
      fields: [
        { name: "symbol", label: "Asset symbol (for example DEMO)" },
        { name: "name", label: "Asset name" },
        {
          name: "kind",
          label: "Record type",
          options: [
            { value: "BUY", label: "Buy" },
            { value: "SELL", label: "Sell" },
            { value: "DIVIDEND", label: "Dividend" },
          ],
        },
        { ...amountField("quantity", "Quantity", "1"), step: "0.00000001" },
        amountField("price", "Price per unit / total dividend (₹)"),
        { ...amountField("fees", "Fees (₹)", "0"), min: "0" },
        dateField(),
      ],
      submit: (v) => request(`/portfolios/${id}/trades`, v),
    });
  }
  function openImport() {
    if (!accountOptions.length) {
      openAccount();
      return;
    }
    setDialog({
      title: "Import CSV statement",
      fields: [
        { name: "accountId", label: "Account", options: accountOptions },
        {
          name: "csv",
          label: "CSV content",
          type: "textarea",
          hint: "Columns: date,merchant,amount,kind. Date: YYYY-MM-DD; kind: INCOME or EXPENSE. Maximum 1,000 rows.",
        },
      ],
      submit: async (v) => {
        const result = await post<{ imported: number; duplicates: number }>(
          "/transactions/import",
          v,
        );
        setToast(
          `Imported ${result.imported} records; skipped ${result.duplicates} duplicates`,
        );
        await refresh();
      },
    });
  }
  function openTransfer() {
    if (accountOptions.length < 2) {
      setToast("Create at least two accounts to transfer funds");
      return;
    }
    setDialog({
      title: "Transfer between accounts",
      fields: [
        { name: "from", label: "From account", options: accountOptions },
        { name: "to", label: "To account", options: accountOptions },
        amountField(),
        dateField(),
      ],
      submit: (v) => request("/transfers", v),
    });
  }
  async function removeTransaction(t: Transaction) {
    setDialog({
      title: t.transferId
        ? "Delete both transfer entries?"
        : "Delete this transaction?",
      fields: [],
      submit: async () => {
        await api(`/transactions/${t.id}`, { method: "DELETE" });
        setToast("Transaction deleted");
        await refresh();
      },
    });
  }
  async function exportMonth() {
    try {
      let p = 1;
      const records: Transaction[] = [];
      let pages = 1;
      do {
        const batch = await api<{ items: Transaction[]; pages: number }>(
          `/transactions?month=${month}&page=${p}`,
        );
        records.push(...batch.items);
        pages = batch.pages;
        p++;
      } while (p <= pages);
      const safe = (s: string) =>
        `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
      const csv = [
        "date,merchant,amount,kind,categoryId",
        ...records.map((t) =>
          [
            t.date.slice(0, 10),
            t.merchant,
            rupees(t.amount),
            t.kind,
            t.categoryId,
          ]
            .map(safe)
            .join(","),
        ),
      ].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `finovaiq-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export failed");
    }
  }
  if (user.isPending)
    return (
      <main id="main" className="loading">
        <span className="brand-mark">
          <ChartNoAxesCombined />
        </span>
        <p>Opening your command center…</p>
      </main>
    );
  if (!user.data) {
    if (user.error instanceof ApiError && user.error.status !== 401)
      return (
        <main id="main" className="fatal">
          <h1>We couldn’t connect to your workspace.</h1>
          <p>{user.error.message}</p>
          <Button onClick={() => void user.refetch()}>Reconnect</Button>
          <p>Check that the API is running on port 4000.</p>
        </main>
      );
    return (
      <AuthScreen
        onSuccess={() => {
          client.removeQueries({
            predicate: (query) => query.queryKey[0] !== "user",
          });
          void user.refetch();
        }}
      />
    );
  }
  const data = dashboard.data;
  const name = user.data.name.split(" ")[0];
  const sectionAction =
    section === "Accounts"
      ? openAccount
      : section === "Budgets"
        ? openBudget
        : section === "Goals"
          ? () => openGoal()
          : section === "Portfolio"
            ? openPortfolio
            : () => openTransaction();
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <a href="/" className="brand">
            <span className="brand-mark">
              <ChartNoAxesCombined size={23} />
            </span>
            Finova<span>IQ</span>
          </a>
          <button
            onClick={() => setMobileOpen(false)}
            className="icon-button mobile-only"
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="workspace-select">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>Personal workspace</strong>
            <small>INR · Individual account</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <small className="nav-label">WORKSPACE</small>
        <nav aria-label="Main navigation">
          {navigation.map(({ title, icon: Icon }) => (
            <button
              key={title}
              aria-label={title}
              onClick={() => setSection(title)}
              aria-current={section === title ? "page" : undefined}
              className={section === title ? "active" : ""}
            >
              <Icon size={18} />
              {title}
              {title === "AI Copilot" && (
                <span className="nav-badge">DEMO</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <div className="promo-icon">
              <Sparkles size={19} />
            </div>
            <strong>Small steps. Big possibilities.</strong>
            <p>Give your next financial milestone a place to grow.</p>
            <button
              onClick={() => {
                setSection("Goals");
                openGoal();
              }}
            >
              Create a goal <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`sidebar-setting ${section === "Settings" ? "active" : ""}`}
            onClick={() => setSection("Settings")}
          >
            <Settings size={18} />
            Settings
          </button>
          <a
            className="sidebar-setting"
            href="https://github.com/manikantbindass/FinovaIQ-AI-Personal-Finance-Investment-Dashboard#readme"
            target="_blank"
            rel="noreferrer"
          >
            <CircleHelp size={18} />
            Help & documentation <ArrowUpRight size={13} />
          </a>
          <div className="user-row">
            <div className="avatar">
              {user.data.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{user.data.name}</strong>
              <small>Personal account</small>
            </div>
            <button
              className="icon-button"
              aria-label="Log out"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <span className="private-label">
              <ShieldCheck size={14} /> Private workspace
            </span>
            <button
              className="icon-button"
              aria-label={
                light ? "Switch to dark mode" : "Switch to light mode"
              }
              onClick={() => {
                setLight(!light);
                document.documentElement.dataset.theme = !light
                  ? "light"
                  : "dark";
                localStorage.setItem(
                  "finovaiq-theme",
                  !light ? "light" : "dark",
                );
              }}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={noticesOpen}
                onClick={() => setNoticesOpen(!noticesOpen)}
              >
                <Bell size={18} />
              </button>
              {noticesOpen && (
                <div className="notification-popover">
                  <h3>Notifications</h3>
                  {notifications.isPending ? (
                    <p>Loading…</p>
                  ) : notifications.error ? (
                    <p role="alert">Unable to load notifications.</p>
                  ) : notifications.data?.length ? (
                    notifications.data.map((n) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          await api(`/notifications/${n.id}`, {
                            method: "PATCH",
                          });
                          await notifications.refetch();
                        }}
                      >
                        <strong>
                          {n.read ? (
                            <Check size={12} />
                          ) : (
                            <span className="live-dot" />
                          )}{" "}
                          {n.title}
                        </strong>
                        <span>{n.body}</span>
                      </button>
                    ))
                  ) : (
                    <p>You’re all caught up.</p>
                  )}
                </div>
              )}
            </div>
            <div className="avatar small">
              {user.data.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
              <h1>
                {section === "Overview"
                  ? `Let’s make progress, ${name}.`
                  : section}
              </h1>
              <p>
                {section === "Overview"
                  ? "A little clarity today. A stronger financial tomorrow."
                  : section === "AI Copilot"
                    ? "Turn your saved financial records into clear answers."
                    : `A clearer view of your ${section.toLowerCase()}.`}
              </p>
            </div>
            <div className="heading-actions">
              {["Overview", "Transactions", "Budgets"].includes(section) && (
                <label className="month-picker">
                  <span className="sr-only">Select month</span>
                  <input
                    type="month"
                    value={month}
                    min="2000-01"
                    max="2099-12"
                    onChange={(e) => {
                      if (e.target.value) {
                        setMonth(e.target.value);
                        setPage(1);
                      }
                    }}
                  />
                </label>
              )}
              {!["AI Copilot", "Forecast", "Settings"].includes(section) && (
                <Button onClick={sectionAction}>
                  <Plus size={16} />
                  {section === "Accounts"
                    ? "Add account"
                    : section === "Budgets"
                      ? "Set budget"
                      : section === "Goals"
                        ? "Create goal"
                        : section === "Portfolio"
                          ? "New portfolio"
                          : "Add transaction"}
                </Button>
              )}
            </div>
          </div>
          {dashboard.isPending ? (
            <div
              className="skeleton-grid"
            role="status"
              aria-busy="true"
              aria-label="Loading financial data"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : dashboard.error ? (
            <div className="error" role="alert">
              Could not load your financial data. {dashboard.error.message}
              <Button
                variant="outline"
                onClick={() => void dashboard.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            data && (
              <motion.div
                key={section}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {section === "Overview" && (
                  <>
                    <div className="overview-banner">
                      <div>
                        <span className="banner-icon">
                          <Sparkles size={18} />
                        </span>
                        <span>
                          <strong>Your next good decision starts here.</strong>{" "}
                          Track a transaction, check a budget, or ask your
                          copilot.
                        </span>
                      </div>
                      <button onClick={() => setSection("AI Copilot")}>
                        Meet your copilot <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="metric-grid">
                      {[
                        {
                          label: "Net worth at cost",
                          value: data.netWorthAtCost,
                          note: "Balances + recorded investment cost",
                          icon: Wallet,
                          featured: true,
                        },
                        {
                          label: "Monthly income",
                          value: data.income,
                          note: "Recorded income, excluding transfers",
                          icon: ArrowDownLeft,
                        },
                        {
                          label: "Monthly expenses",
                          value: data.expenses,
                          note: "Recorded expenses, excluding transfers",
                          icon: ArrowUpRight,
                        },
                        {
                          label: "Available balance",
                          value: data.balance,
                          note: `${data.accounts.length} connected manual accounts`,
                          icon: CreditCard,
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className={`metric-card ${m.featured ? "featured" : ""}`}
                        >
                          <div className="metric-label">
                            {m.label}
                            <span className="metric-icon">
                              <m.icon size={17} />
                            </span>
                          </div>
                          <strong>{formatMoney(m.value)}</strong>
                          <div className="metric-note">
                            {m.featured ? (
                              <span className="live-dot" />
                            ) : (
                              <span className="muted-dot" />
                            )}
                            {m.note}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="dashboard-grid">
                      <Panel
                        title="Cash flow"
                        subtitle="Every inflow and outflow, in perspective."
                        action={
                          <div className="chart-legend">
                            <span>
                              <i />
                              Income
                            </span>
                            <span>
                              <i />
                              Expenses
                            </span>
                          </div>
                        }
                        className="cashflow-panel"
                      >
                        <div className="cashflow-summary">
                          <div>
                            <small>NET CASH FLOW</small>
                            <strong>{formatMoney(data.netCashFlow)}</strong>
                          </div>
                          <div className="savings-badge">
                            <TrendingUp size={14} />
                            {data.savingsRate}% savings rate
                          </div>
                        </div>
                        <CashflowChart points={data.cashflow} />
                      </Panel>
                      <Panel
                        title="Where it goes"
                        subtitle="Your spending, by category."
                      >
                        <SpendingChart items={data.spending} />
                      </Panel>
                      <Panel
                        title="Recent transactions"
                        subtitle="The latest movements in your month."
                        action={
                          <button
                            className="text-link"
                            onClick={() => setSection("Transactions")}
                          >
                            View all <ArrowUpRight size={14} />
                          </button>
                        }
                        className="recent-panel"
                      >
                        <TransactionTable items={data.recent.slice(0, 5)} />
                      </Panel>
                      <Panel
                        title="Your goals"
                        subtitle="A little closer with every step."
                        action={
                          <button
                            className="icon-button"
                            aria-label="Create goal"
                            onClick={() => openGoal()}
                          >
                            <Plus size={17} />
                          </button>
                        }
                      >
                        {data.goals.length ? (
                          <div className="goal-list">
                            {data.goals.slice(0, 3).map((g) => (
                              <button
                                key={g.id}
                                className="goal-preview"
                                onClick={() => {
                                  setSection("Goals");
                                  openGoal(g);
                                }}
                              >
                                <div>
                                  <span className="goal-icon">
                                    <Target size={18} />
                                  </span>
                                  <strong>{g.name}</strong>
                                  <span>
                                    {Math.round(
                                      (Number(g.saved) / Number(g.target)) *
                                        100,
                                    )}
                                    %
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (Number(g.saved) / Number(g.target)) * 100
                                  }
                                />
                                <small>
                                  {formatMoney(g.saved, true)}{" "}
                                  <span>of {formatMoney(g.target, true)}</span>
                                </small>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Empty>
                            Create a goal and make your next milestone tangible.
                          </Empty>
                        )}
                      </Panel>
                    </div>
                    <div className="insight-strip">
                      <div className="insight-star">
                        <Sparkles size={21} />
                      </div>
                      <div>
                        <span className="eyebrow">
                          A MOMENT OF CLARITY · CALCULATED INSIGHT
                        </span>
                        <p>{data.insights[0]}</p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => setSection("AI Copilot")}
                      >
                        Explore <ArrowRight size={16} />
                      </button>
                    </div>
                    <p className="data-footnote">
                      <ShieldCheck size={13} />
                      {data.dataNote}
                    </p>
                  </>
                )}
                {section === "Transactions" && (
                  <Panel
                    title="All transactions"
                    subtitle="Search, edit, import, and keep your records in order."
                    action={
                      <div className="inline-actions">
                        <Button variant="outline" onClick={openImport}>
                          <Upload size={15} />
                          Import
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void exportMonth()}
                        >
                          <Download size={15} />
                          Export
                        </Button>
                      </div>
                    }
                  >
                    <div className="table-toolbar">
                      <label className="search">
                        <Search size={17} />
                        <input
                          placeholder="Search merchants…"
                          aria-label="Search merchants"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <span>{transactions.data?.total ?? 0} records</span>
                    </div>
                    {transactions.isPending ? (
                      <p className="empty">Loading transactions…</p>
                    ) : transactions.error ? (
                      <p className="error" role="alert">
                        {transactions.error.message}
                      </p>
                    ) : (
                      <TransactionTable
                        items={transactions.data?.items ?? []}
                        onEdit={openTransaction}
                        onDelete={(t) => void removeTransaction(t)}
                      />
                    )}
                    <div className="pagination">
                      <span>
                        Page {page} of {transactions.data?.pages ?? 1}
                      </span>
                      <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        disabled={page >= (transactions.data?.pages ?? 1)}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </Panel>
                )}
                {section === "Accounts" && (
                  <>
                    <div className="section-toolbar">
                      <p>
                        Manual accounts · INR · balances calculated from saved
                        transactions
                      </p>
                      <Button variant="outline" onClick={openTransfer}>
                        <ArrowLeftRight size={16} />
                        Transfer money
                      </Button>
                    </div>
                    <div className="cards-grid">
                      {data.accounts.map((a, i) => (
                        <div
                          className={`account-card account-${i % 3}`}
                          key={a.id}
                        >
                          <div>
                            <span className="account-bank">
                              <Wallet size={21} />
                            </span>
                            <span className="pill">{a.type}</span>
                          </div>
                          <h2>{a.name}</h2>
                          <small>AVAILABLE BALANCE</small>
                          <strong>{formatMoney(a.balance)}</strong>
                          <footer>
                            <span>INR · Manual account</span>
                            <ShieldCheck size={17} />
                          </footer>
                        </div>
                      ))}
                    </div>
                    {!data.accounts.length && (
                      <Empty>
                        Add your first account to start tracking your money.
                      </Empty>
                    )}
                  </>
                )}
                {section === "Budgets" && (
                  <>
                    <div className="summary-strip">
                      <div>
                        <small>MONTHLY BUDGET</small>
                        <strong>
                          {formatMoney(
                            data.budgets.reduce(
                              (n, b) => n + Number(b.amount),
                              0,
                            ),
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>SPENT IN BUDGETED CATEGORIES</small>
                        <strong>
                          {formatMoney(
                            data.budgets.reduce(
                              (n, b) => n + Number(b.spent),
                              0,
                            ),
                          )}
                        </strong>
                      </div>
                      <p>
                        Set a budget again for the same category and month to
                        update its limit.
                      </p>
                    </div>
                    <div className="cards-grid">
                      {data.budgets.map((b) => (
                        <BudgetCard
                          key={b.id}
                          budget={b}
                          onClick={() =>
                            setDialog({
                              title: "Update budget",
                              fields: [
                                amountField(
                                  "amount",
                                  "Monthly limit (₹)",
                                  rupees(b.amount),
                                ),
                              ],
                              submit: (v) =>
                                request("/budgets", {
                                  ...v,
                                  categoryId: b.categoryId,
                                  month: b.month,
                                }),
                            })
                          }
                        />
                      ))}
                    </div>
                    {!data.budgets.length && (
                      <Empty>
                        Give every category a little direction. Set your first
                        budget.
                      </Empty>
                    )}
                  </>
                )}
                {section === "Goals" && (
                  <>
                    <p className="section-note">
                      Goal balances are manually tracked and do not add to your
                      net worth. Contributions are a zero-return planning
                      baseline.
                    </p>
                    <div className="cards-grid">
                      {data.goals.map((g) => (
                        <div key={g.id} className="panel goal-card">
                          <div className="card-top">
                            <span className="goal-icon">
                              <Target size={22} />
                            </span>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${g.name}`}
                              onClick={() => openGoal(g)}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                          <h2>{g.name}</h2>
                          <p>
                            Target:{" "}
                            {new Date(g.targetDate).toLocaleDateString(
                              "en-IN",
                              {
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              },
                            )}
                          </p>
                          <strong>
                            {formatMoney(g.saved)}{" "}
                            <small>of {formatMoney(g.target)}</small>
                          </strong>
                          <Progress
                            value={(Number(g.saved) / Number(g.target)) * 100}
                          />
                          <div className="goal-meta">
                            <span>
                              {Math.round(
                                (Number(g.saved) / Number(g.target)) * 100,
                              )}
                              % complete
                            </span>
                            <span>
                              {formatMoney(g.monthlyContribution, true)} / month
                            </span>
                          </div>
                          <p className="goal-estimate">
                            {BigInt(g.saved) >= BigInt(g.target)
                              ? "Goal reached. Make room for what’s next."
                              : BigInt(g.monthlyContribution) > 0n
                                ? `${(BigInt(g.target) - BigInt(g.saved) + BigInt(g.monthlyContribution) - 1n) / BigInt(g.monthlyContribution)} contributions remaining at your planned amount.`
                                : "Add a monthly contribution to estimate completion."}
                          </p>
                        </div>
                      ))}
                    </div>
                    {!data.goals.length && (
                      <Empty>
                        What are you working toward? Create your first goal.
                      </Empty>
                    )}
                  </>
                )}
                {section === "Portfolio" && (
                  <>
                    <div className="disclosure">
                      <ShieldCheck size={18} />
                      <span>
                        Recorded cost and weighted-average realized gains only.
                        Live prices, unrealized gains, corporate actions, and
                        currency conversion are unavailable. Trades do not
                        automatically debit cash accounts.
                      </span>
                    </div>
                    {portfolios.isPending ? (
                      <p>Loading portfolios…</p>
                    ) : portfolios.error ? (
                      <p role="alert" className="error">
                        {portfolios.error.message}
                      </p>
                    ) : (
                      portfolios.data?.map((p) => (
                        <Panel
                          key={p.id}
                          title={p.name}
                          subtitle="INR · weighted-average cost basis, including fees"
                          action={
                            <Button
                              variant="outline"
                              onClick={() => openTrade(p.id)}
                            >
                              <Plus size={16} />
                              Record trade
                            </Button>
                          }
                          className="portfolio-panel"
                        >
                          {p.holdings.length ? (
                            <div
                              className="table-scroll"
                              tabIndex={0}
                              role="region"
                              aria-label="Financial records"
                            >
                              <table>
                                <thead>
                                  <tr>
                                    <th>Asset</th>
                                    <th>Quantity</th>
                                    <th>Recorded cost</th>
                                    <th>Realized P/L</th>
                                    <th>Net dividends</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.holdings.map((h) => (
                                    <tr key={h.asset.symbol}>
                                      <td>
                                        <strong>{h.asset.symbol}</strong>
                                        <small>{h.asset.name}</small>
                                      </td>
                                      <td>
                                        {Number(h.quantity).toLocaleString(
                                          "en-IN",
                                          { maximumFractionDigits: 8 },
                                        )}
                                      </td>
                                      <td>{formatMoney(h.cost)}</td>
                                      <td
                                        className={
                                          BigInt(h.realized) >= 0n
                                            ? "positive"
                                            : "negative"
                                        }
                                      >
                                        {formatMoney(h.realized)}
                                      </td>
                                      <td>{formatMoney(h.dividends)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Empty>Record a buy to start your holdings.</Empty>
                          )}
                          <details>
                            <summary>Trade history ({p.trades.length})</summary>
                            <div
                              className="table-scroll"
                              tabIndex={0}
                              role="region"
                              aria-label="Financial records"
                            >
                              <table>
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Asset</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Unit price / dividend</th>
                                    <th>Fees</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.trades.map((t) => (
                                    <tr key={t.id}>
                                      <td>{t.date.slice(0, 10)}</td>
                                      <td>{t.asset.symbol}</td>
                                      <td>{t.kind}</td>
                                      <td>{t.quantity}</td>
                                      <td>{formatMoney(t.price)}</td>
                                      <td>{formatMoney(t.fees)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        </Panel>
                      ))
                    )}
                    {portfolios.data?.length === 0 && (
                      <Empty>
                        Create a portfolio to record your investments.
                      </Empty>
                    )}
                  </>
                )}
                {section === "AI Copilot" && (
                  <Copilot
                    onUpdate={() =>
                      void client.invalidateQueries({
                        queryKey: ["subscription"],
                      })
                    }
                  />
                )}
                {section === "Forecast" && <Forecast />}
                {section === "Settings" && (
                  <div className="settings-grid">
                    <Panel
                      title="Your profile"
                      subtitle="The person behind the progress."
                    >
                      <div className="profile-detail">
                        <span className="avatar">
                          {user.data.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h3>{user.data.name}</h3>
                          <p>{user.data.email}</p>
                          <small>
                            {user.data.verified
                              ? "Email verified"
                              : "Email verification pending"}
                          </small>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setDialog({
                            title: "Update profile",
                            fields: [
                              {
                                name: "name",
                                label: "Your name",
                                value: user.data.name,
                              },
                            ],
                            submit: (v) => request("/users/me", v, "PATCH"),
                          })
                        }
                      >
                        Edit profile
                      </Button>
                      {!user.data.verified &&
                        typeof window !== "undefined" &&
                        sessionStorage.getItem("finovaiq-verification") && (
                          <p>
                            <a
                              className="text-link"
                              href={sessionStorage.getItem(
                                "finovaiq-verification",
                              )!}
                              onClick={async (e) => {
                                e.preventDefault();
                                const token = new URL(
                                  sessionStorage.getItem(
                                    "finovaiq-verification",
                                  )!,
                                ).searchParams.get("token");
                                await post("/auth/verify", { token });
                                sessionStorage.removeItem(
                                  "finovaiq-verification",
                                );
                                await refresh();
                              }}
                            >
                              Verify email (local development link)
                            </a>
                          </p>
                        )}
                    </Panel>
                    <Panel
                      title="Plan & usage"
                      subtitle="No payment collection is enabled."
                    >
                      <span className="pill">
                        {subscription.data?.tier ?? "FREE"} ·{" "}
                        {subscription.data?.status ?? "DEMO"}
                      </span>
                      <p>
                        {subscription.data?.aiUsage ?? 0} copilot requests used
                        in {subscription.data?.usageMonth ?? month}.
                      </p>
                      <Progress
                        value={((subscription.data?.aiUsage ?? 0) / 30) * 100}
                      />
                      <p className="section-note">
                        Free plan: 30 requests per calendar month. Quota resets
                        at your first request in the new month.
                      </p>
                    </Panel>
                    <Panel
                      title="Data & privacy"
                      subtitle="Manual records, kept in your local PostgreSQL database."
                    >
                      <p>
                        There are no real bank connections. Export monthly
                        transactions from Transactions. Production retention and
                        account deletion workflows are still pending.
                      </p>
                      <Button variant="outline" onClick={() => logout.mutate()}>
                        <LogOut size={16} />
                        Sign out
                      </Button>
                    </Panel>
                  </div>
                )}
              </motion.div>
            )
          )}
          <footer className="app-footer">
            <span>
              FinovaIQ <span>·</span> Your Intelligent Financial Command Center
            </span>
            <span>
              <span className="live-dot" /> Manual finance workspace
            </span>
          </footer>
        </main>
      </div>
      {dialog && (
        <DialogForm
          title={dialog.title}
          fields={dialog.fields}
          onClose={() => setDialog(null)}
          onSubmit={dialog.submit}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function TransactionTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Transaction[];
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}) {
  if (!items.length)
    return (
      <Empty>
        No transactions yet. Add one to bring your dashboard to life.
      </Empty>
    );
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Financial records"
    >
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Category</th>
            <th>Date</th>
            <th className="align-right">Amount</th>
            {onEdit && (
              <th>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="transaction-title">
                  <span
                    className={`transaction-icon ${t.kind === "INCOME" ? "income" : ""}`}
                  >
                    {t.kind === "INCOME" ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{t.merchant}</strong>
                    <small>
                      {t.account.name}
                      {t.recurring ? " · Recurring" : ""}
                    </small>
                  </span>
                </div>
              </td>
              <td>
                <span className="category-pill">{t.category.name}</span>
              </td>
              <td className="muted">
                {new Date(t.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                })}
              </td>
              <td
                className={`align-right amount ${t.kind === "INCOME" ? "positive" : ""}`}
              >
                {t.kind === "INCOME" ? "+" : "−"}
                {formatMoney(t.amount)}
              </td>
              {onEdit && (
                <td>
                  <div className="inline-actions">
                    {!t.transferId && (
                      <button
                        className="icon-button"
                        aria-label={`Edit ${t.merchant}`}
                        onClick={() => onEdit(t)}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Delete ${t.merchant}`}
                      onClick={() => onDelete?.(t)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function BudgetCard({
  budget: b,
  onClick,
}: {
  budget: Budget;
  onClick: () => void;
}) {
  const progress = (Number(b.spent) / Number(b.amount)) * 100;
  return (
    <div className="panel budget-card">
      <div className="card-top">
        <span className="goal-icon">
          <CreditCard size={20} />
        </span>
        <span className={`pill ${progress > 100 ? "danger" : ""}`}>
          {progress > 100
            ? "Over budget"
            : progress >= 80
              ? "Near limit"
              : "On track"}
        </span>
      </div>
      <h2>{b.category.name}</h2>
      <strong>
        {formatMoney(b.spent)} <small>of {formatMoney(b.amount)}</small>
      </strong>
      <Progress value={progress} />
      <div className="goal-meta">
        <span>{Math.round(progress)}% used</span>
        <button className="text-link" onClick={onClick}>
          Edit limit <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}
function Copilot({ onUpdate }: { onUpdate: () => void }) {
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<Conversation[]>("/ai/conversations"),
  });
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  async function ask(message: string) {
    if (busy || !message.trim()) return;
    setBusy(true);
    setAnswer("");
    setError("");
    setQuestion("");
    try {
      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message ?? "Copilot unavailable");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming unavailable");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const data = JSON.parse(line.slice(6)) as {
            text?: string;
            conversationId?: string;
          };
          if (data.text) setAnswer((a) => a + data.text);
          if (data.conversationId) setConversationId(data.conversationId);
        }
      }
      await client.invalidateQueries({ queryKey: ["conversations"] });
      onUpdate();
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to get a response");
    } finally {
      setBusy(false);
    }
  }
  const current = history.data?.find((c) => c.id === conversationId);
  return (
    <div className="copilot-layout">
      <Panel
        title="Your finance copilot"
        subtitle="Demo: deterministic answers from your authorized saved records."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setConversationId(undefined);
              setAnswer("");
            }}
          >
            New conversation
          </Button>
        }
      >
        <div className="chat-intro">
          <span className="copilot-orb">
            <Sparkles size={30} />
          </span>
          <h2>A little insight goes a long way.</h2>
          <p>Ask about your spending, saving, or recorded investments.</p>
          <div className="prompt-grid">
            {[
              "How much did I spend this month?",
              "Which category do I spend the most on?",
              "How much am I saving?",
              "What is my investment cost?",
            ].map((q) => (
              <button key={q} disabled={busy} onClick={() => void ask(q)}>
                {q}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="chat-messages" aria-live="polite">
          {current?.messages.map((m) => (
            <div key={m.id} className={`chat-message ${m.role}`}>
              <span>
                {m.role === "assistant" ? (
                  <Sparkles size={16} />
                ) : (
                  <span>You</span>
                )}
              </span>
              <p>{m.content}</p>
            </div>
          ))}
          {answer && (
            <div className="chat-message assistant">
              <Sparkles size={16} />
              <p>{answer}</p>
            </div>
          )}
          {busy && !answer && (
            <p className="muted">Calculating from your saved records…</p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <input
            aria-label="Ask a financial question"
            placeholder="Ask something about your finances…"
            value={question}
            maxLength={2000}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            disabled={busy || !question.trim()}
            aria-label="Send question"
          >
            <Send size={17} />
          </Button>
        </form>
        <p className="data-footnote">
          Demo supports predefined question types. No external AI request is
          made in demo mode.
        </p>
      </Panel>
      <Panel
        title="Conversation history"
        subtitle="Only your conversations appear here."
      >
        <div className="conversation-list">
          {history.data?.map((c, i) => (
            <button
              key={c.id}
              className={current?.id === c.id ? "selected" : ""}
              onClick={() => setConversationId(c.id)}
            >
              <Sparkles size={15} />
              <span>
                {c.messages.find((m) => m.role === "user")?.content ??
                  `Conversation ${i + 1}`}
              </span>
            </button>
          ))}
          {!history.data?.length && (
            <p className="muted">Your first question starts a conversation.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
function Forecast() {
  const [monthly, setMonthly] = useState("15000");
  const [months, setMonths] = useState(12);
  const [initial, setInitial] = useState("0");
  const forecast = useMutation({
    mutationFn: () =>
      post<{
        method: string;
        assumptions: string[];
        points: { month: number; value: string }[];
      }>("/analytics/forecast", { monthly, months, initial }),
  });
  const last = forecast.data?.points.at(-1);
  return (
    <div className="forecast-layout">
      <Panel
        title="Make room for possibility"
        subtitle="A transparent, zero-return savings scenario."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            forecast.mutate();
          }}
        >
          <label>
            Starting amount (₹)
            <input
              type="number"
              value={initial}
              min="0"
              step="0.01"
              required
              onChange={(e) => setInitial(e.target.value)}
            />
          </label>
          <label>
            Monthly contribution (₹)
            <input
              type="number"
              value={monthly}
              min="0"
              step="0.01"
              required
              onChange={(e) => setMonthly(e.target.value)}
            />
          </label>
          <label>
            Number of months
            <input
              type="number"
              value={months}
              min="1"
              max="600"
              required
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </label>
          <Button disabled={forecast.isPending}>
            <ChartNoAxesCombined size={16} />
            Calculate scenario
          </Button>
        </form>
        {forecast.error && (
          <p role="alert" className="error">
            {forecast.error.message}
          </p>
        )}
      </Panel>
      <Panel
        title="Your potential progress"
        subtitle="Contributions only. No promised investment returns."
      >
        {last ? (
          <>
            <div className="forecast-value">
              <span>AFTER {last.month} MONTHS</span>
              <strong>{formatMoney(last.value)}</strong>
              <p>{forecast.data?.method}</p>
            </div>
            <ul className="assumptions">
              {forecast.data?.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <details>
              <summary>View monthly breakdown</summary>
              <div className="forecast-breakdown">
                {forecast.data?.points.map((p) => (
                  <div key={p.month}>
                    <span>Month {p.month}</span>
                    <strong>{formatMoney(p.value)}</strong>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <Empty>
            Choose a monthly contribution to see where consistency could take
            you.
          </Empty>
        )}
      </Panel>
    </div>
  );
}
