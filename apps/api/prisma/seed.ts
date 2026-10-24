import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { categories, categoryId, currentMonth, minor } from "../src/finance";
const db = new PrismaClient();
async function seed() {
  for (const name of categories)
    await db.category.upsert({
      where: { id: categoryId(name) },
      create: { id: categoryId(name), name },
      update: {},
    });
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is disabled in production");
  const existing = await db.user.findUnique({
    where: { email: "demo@finovaiq.test" },
  });
  if (existing) {
    console.log(
      "Categories ready; demo user already exists. Existing records preserved.",
    );
    return;
  }
  await db.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          email: "demo@finovaiq.test",
          name: "Alex Morgan",
          passwordHash: await hash("FinovaDemo2026!", 12),
          verified: true,
          subscription: { create: { usageMonth: currentMonth() } },
        },
      });
      const bank = await tx.account.create({
        data: {
          userId: user.id,
          name: "Everyday account",
          type: "BANK",
          openingBalance: minor("164500"),
        },
      });
      await tx.account.create({
        data: {
          userId: user.id,
          name: "Future fund",
          type: "SAVINGS",
          openingBalance: minor("280000"),
        },
      });
      const rows: [number, string, string, string, string, boolean][] = [
        [1, "Northstar Studio · Salary", "125000", "INCOME", "Salary", true],
        [2, "Apartment rent", "22000", "EXPENSE", "Housing", true],
        [
          3,
          "Fresh market groceries",
          "3250",
          "EXPENSE",
          "Food & dining",
          false,
        ],
        [4, "Metro pass", "1500", "EXPENSE", "Transport", true],
        [5, "Freelance design project", "18000", "INCOME", "Freelance", false],
        [6, "Internet plan", "999", "EXPENSE", "Utilities", true],
        [7, "Weekend cafe", "1450", "EXPENSE", "Food & dining", false],
        [8, "Bookshop", "2400", "EXPENSE", "Education", false],
        [10, "Streaming subscription", "649", "EXPENSE", "Entertainment", true],
        [12, "Home essentials", "4800", "EXPENSE", "Shopping", false],
        [14, "Health checkup", "2200", "EXPENSE", "Health", false],
        [16, "Lunch with friends", "1800", "EXPENSE", "Food & dining", false],
        [18, "Ride home", "450", "EXPENSE", "Transport", false],
        [
          20,
          "Fresh market groceries",
          "2600",
          "EXPENSE",
          "Food & dining",
          false,
        ],
      ];
      for (const [day, merchant, amount, kind, category, recurring] of rows) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            accountId: bank.id,
            categoryId: categoryId(category),
            amount: minor(amount),
            kind,
            merchant,
            date: new Date(
              `${currentMonth()}-${day.toString().padStart(2, "0")}`,
            ),
            recurring,
          },
        });
      }
      for (const [name, amount] of [
        ["Food & dining", "12000"],
        ["Shopping", "8000"],
        ["Transport", "5000"],
        ["Housing", "25000"],
      ])
        await tx.budget.create({
          data: {
            userId: user.id,
            categoryId: categoryId(name),
            amount: minor(amount),
            month: currentMonth(),
          },
        });
      for (const [name, target, saved, monthly] of [
        ["Emergency fund", "600000", "280000", "15000"],
        ["Japan adventure", "200000", "85000", "10000"],
        ["A place of my own", "1500000", "320000", "20000"],
      ])
        await tx.goal.create({
          data: {
            userId: user.id,
            name,
            target: minor(target),
            saved: minor(saved),
            monthlyContribution: minor(monthly),
            targetDate: new Date("2028-12-31"),
          },
        });
      const portfolio = await tx.portfolio.create({
        data: { userId: user.id, name: "Long-term portfolio" },
      });
      const asset = await tx.asset.upsert({
        where: { symbol: "DEMO-ETF" },
        create: {
          symbol: "DEMO-ETF",
          name: "Fictional broad market demo fund",
        },
        update: {},
      });
      await tx.trade.create({
        data: {
          portfolioId: portfolio.id,
          assetId: asset.id,
          quantity: new Prisma.Decimal(100),
          price: minor("1250"),
          fees: minor("100"),
          kind: "BUY",
          date: new Date(`${currentMonth()}-01`),
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Welcome to your demo workspace",
          body: "All seeded records are fictional. Create your own account for an empty workspace.",
        },
      });
    },
    { maxWait: 10000, timeout: 60000 },
  );
  console.log("Synthetic demo seeded: demo@finovaiq.test / FinovaDemo2026!");
}
void seed()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
