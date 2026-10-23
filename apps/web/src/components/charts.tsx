"use client";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatMoney } from "@/lib/api";
const colors = [
  "#2dd4bf",
  "#7384f5",
  "#f6b76c",
  "#dd81ba",
  "#7ab6df",
  "#ac9bfb",
];
export function CashflowChart({
  points,
}: {
  points: { date: string; income: string; expenses: string }[];
}) {
  if (!points.length)
    return (
      <div className="empty chart-empty">
        Your cash flow takes shape as you add transactions.
      </div>
    );
  return (
    <div
      className="chart"
      role="img"
      aria-label="Daily income and expense chart. Exact totals are shown in the summary cards."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points.map((p) => ({
            ...p,
            income: Number(p.income),
            expenses: Number(p.expenses),
          }))}
          margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7384f5" stopOpacity={0.14} />
              <stop offset="95%" stopColor="#7384f5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--line)"
            vertical={false}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(s) => s.slice(8)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            width={55}
            tickFormatter={(n) => formatMoney(n, true)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              color: "var(--text)",
            }}
            formatter={(v) => formatMoney(Number(v))}
          />
          <Area
            type="monotone"
            name="Income"
            dataKey="income"
            stroke="#2dd4bf"
            strokeWidth={2.5}
            fill="url(#income)"
          />
          <Area
            type="monotone"
            name="Expenses"
            dataKey="expenses"
            stroke="#7384f5"
            strokeWidth={2}
            fill="url(#expense)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SpendingChart({
  items,
}: {
  items: { name: string; value: string }[];
}) {
  if (!items.length)
    return (
      <div className="empty chart-empty">No expenses in this month yet.</div>
    );
  const total = items.reduce((n, x) => n + Number(x.value), 0);
  return (
    <>
      <div
        className="donut"
        role="img"
        aria-label="Spending by category; amounts listed below"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={items.map((i) => ({ ...i, value: Number(i.value) }))}
              dataKey="value"
              innerRadius={67}
              outerRadius={87}
              paddingAngle={4}
              stroke="none"
            >
              {items.map((i, index) => (
                <Cell key={i.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <small>Total spent</small>
          <strong>{formatMoney(total, true)}</strong>
        </div>
      </div>
      <div className="spend-legend">
        {items.map((item, i) => (
          <div key={item.name}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {item.name}
            </span>
            <strong>{formatMoney(item.value, true)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
