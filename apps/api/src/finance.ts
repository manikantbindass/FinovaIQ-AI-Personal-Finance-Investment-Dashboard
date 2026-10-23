import { Prisma } from "@prisma/client";
// Exact price × quantity products can exceed Decimal's default precision.
Prisma.Decimal.set({ precision: 48, rounding: Prisma.Decimal.ROUND_HALF_UP });

export const categories = [
  "Salary",
  "Freelance",
  "Food & dining",
  "Shopping",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Entertainment",
  "Education",
  "Transfer",
  "Other",
];
export const categoryId = (name: string) =>
  name.toLowerCase().replace(/[^a-z]+/g, "-");
export function minor(value: string): bigint {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value))
    throw new Error("Use a positive amount with at most two decimals");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function money(value: bigint): string {
  const negative = value < 0n;
  const n = negative ? -value : value;
  return `${negative ? "-" : ""}${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { gte: start, lt: end };
}
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export function categorize(merchant: string): string {
  const rules: [RegExp, string][] = [
    [/swiggy|zomato|cafe|restaurant|grocery/i, "Food & dining"],
    [/uber|ola|metro|fuel/i, "Transport"],
    [/netflix|spotify|cinema/i, "Entertainment"],
    [/rent/i, "Housing"],
    [/salary|payroll/i, "Salary"],
    [/amazon|flipkart/i, "Shopping"],
    [/electric|internet|broadband/i, "Utilities"],
  ];
  return categoryId(
    rules.find(([rule]) => rule.test(merchant))?.[1] ?? "Other",
  );
}
export type TradeInput = {
  kind: string;
  quantity: Prisma.Decimal;
  price: bigint;
  fees: bigint;
};
export function position(trades: TradeInput[]) {
  let quantity = new Prisma.Decimal(0),
    cost = new Prisma.Decimal(0),
    realized = new Prisma.Decimal(0),
    dividends = 0n;
  for (const trade of trades) {
    const proceeds = trade.quantity.mul(trade.price.toString());
    if (trade.kind === "BUY") {
      quantity = quantity.add(trade.quantity);
      cost = cost.add(proceeds).add(trade.fees.toString());
    } else if (trade.kind === "SELL") {
      if (trade.quantity.gt(quantity)) throw new Error("Insufficient holdings");
      const removed = cost.mul(trade.quantity).div(quantity);
      realized = realized.add(proceeds.sub(trade.fees.toString()).sub(removed));
      cost = cost.sub(removed);
      quantity = quantity.sub(trade.quantity);
    } else if (trade.kind === "DIVIDEND") dividends += trade.price - trade.fees;
  }
  return {
    quantity: quantity.toFixed(8),
    cost: BigInt(cost.toFixed(0)),
    realized: BigInt(realized.toFixed(0)),
    dividends,
  };
}
