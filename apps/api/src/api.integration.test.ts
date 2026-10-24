import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "./application";
import { Db } from "./db";
import { categories, categoryId } from "./finance";
describe.skipIf(process.env.RUN_INTEGRATION !== "1")(
  "PostgreSQL API integration",
  () => {
    let app: INestApplication;
    let db: Db;
    let cookie: string;
    let otherCookie: string;
    let userId: string;
    let otherId: string;
    let accountId: string;
    let otherAccountId: string;
    let transactionId: string;
    let portfolioId: string;
    let conversationId: string;
    let verificationToken: string;
    const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const month = new Date().toISOString().slice(0, 7);
    const date = `${month}-02`;
    const suffix = Date.now();
    const auth = () => request(app.getHttpServer());
    beforeAll(async () => {
      app = await createApp();
      await app.init();
      db = app.get(Db);
      for (const name of categories)
        await db.category.upsert({
          where: { id: categoryId(name) },
          create: { id: categoryId(name), name },
          update: {},
        });
    });
    afterAll(async () => {
      if (db)
        await db.user.deleteMany({
          where: { id: { in: [userId, otherId].filter(Boolean) } },
        });
      if (app) await app.close();
    });
    it("redirects backend visitors to the configured frontend", async () => {
      await auth()
        .get("/?redirect=https://untrusted.example")
        .expect(302)
        .expect("Location", origin)
        .expect("Cache-Control", "no-store");
      await auth().get("/missing").expect(404);
    });
    it("rejects unauthenticated access and untrusted origins", async () => {
      await auth().get("/api/v1/accounts").expect(401);
      await auth().post("/api/v1/auth/login").send({}).expect(403);
    });
    it("registers and establishes HttpOnly sessions", async () => {
      const result = await auth()
        .post("/api/v1/auth/register")
        .set("Origin", origin)
        .send({
          email: `integration-${suffix}@example.test`,
          name: "Test One",
          password: "Integration2026!",
        })
        .expect(201);
      userId = result.body.id;
      cookie = result.headers["set-cookie"][0].split(";")[0];
      verificationToken = new URL(
        result.body.verificationLink,
      ).searchParams.get("token")!;
      expect(result.headers["set-cookie"][0]).toContain("HttpOnly");
      expect(result.body.passwordHash).toBeUndefined();
      const other = await auth()
        .post("/api/v1/auth/register")
        .set("Origin", origin)
        .send({
          email: `other-${suffix}@example.test`,
          name: "Other User",
          password: "Integration2026!",
        })
        .expect(201);
      otherId = other.body.id;
      otherCookie = other.headers["set-cookie"][0].split(";")[0];
    });
    it("verifies email exactly once", async () => {
      await auth()
        .post("/api/v1/auth/verify")
        .set("Origin", origin)
        .send({ token: verificationToken })
        .expect(201);
      await auth()
        .post("/api/v1/auth/verify")
        .set("Origin", origin)
        .send({ token: verificationToken })
        .expect(400);
    });
    it("rejects unknown fields and invalid amounts", async () => {
      await auth()
        .post("/api/v1/accounts")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ name: "Test", openingBalance: "1.001", userId: otherId })
        .expect(400);
    });
    it("persists accounts and isolates ownership", async () => {
      const a = await auth()
        .post("/api/v1/accounts")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ name: "Test bank", openingBalance: "1000" })
        .expect(201);
      accountId = a.body.id;
      const b = await auth()
        .post("/api/v1/accounts")
        .set("Cookie", otherCookie)
        .set("Origin", origin)
        .send({ name: "Other bank" })
        .expect(201);
      otherAccountId = b.body.id;
      await auth()
        .post("/api/v1/transactions")
        .set("Cookie", otherCookie)
        .set("Origin", origin)
        .send({
          accountId,
          categoryId: "salary",
          amount: "100",
          kind: "INCOME",
          merchant: "Attack",
          date,
        })
        .expect(404);
    });
    it("calculates income, expense, balances, and budgets exactly", async () => {
      await auth()
        .post("/api/v1/transactions")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({
          accountId,
          categoryId: "salary",
          amount: "5000.10",
          kind: "INCOME",
          merchant: "Income",
          date,
        })
        .expect(201);
      const t = await auth()
        .post("/api/v1/transactions")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({
          accountId,
          categoryId: "food-dining",
          amount: "100.20",
          kind: "EXPENSE",
          merchant: "Cafe",
          date,
        })
        .expect(201);
      transactionId = t.body.id;
      await auth()
        .post("/api/v1/budgets")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ categoryId: "food-dining", amount: "200", month })
        .expect(201);
      const result = await auth()
        .get(`/api/v1/analytics/dashboard?month=${month}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(result.body.income).toBe("500010");
      expect(result.body.expenses).toBe("10020");
      expect(result.body.balance).toBe("589990");
      expect(result.body.budgets[0].spent).toBe("10020");
    });
    it("prevents unauthorized deletes and administrative access", async () => {
      await auth()
        .delete(`/api/v1/transactions/${transactionId}`)
        .set("Cookie", otherCookie)
        .set("Origin", origin)
        .expect(404);
      await auth().get("/api/v1/admin/usage").set("Cookie", cookie).expect(403);
    });
    it("imports idempotently and classifies merchants", async () => {
      const payload = {
        accountId,
        csv: `date,merchant,amount,kind\n${date},Swiggy,20.10,EXPENSE`,
      };
      for (const expected of [1, 0]) {
        const result = await auth()
          .post("/api/v1/transactions/import")
          .set("Cookie", cookie)
          .set("Origin", origin)
          .send(payload)
          .expect(201);
        expect(result.body.imported).toBe(expected);
      }
    });
    it("keeps transfers atomic and excludes them from income/expense", async () => {
      const a = await auth()
        .post("/api/v1/accounts")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ name: "Savings" })
        .expect(201);
      await auth()
        .post("/api/v1/transfers")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ from: accountId, to: otherAccountId, amount: "10", date })
        .expect(404);
      await auth()
        .post("/api/v1/transfers")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ from: accountId, to: a.body.id, amount: "100", date })
        .expect(201);
      const d = await auth()
        .get("/api/v1/analytics/dashboard")
        .set("Cookie", cookie)
        .expect(200);
      expect(d.body.income).toBe("500010");
      expect(d.body.expenses).toBe("12030");
      expect(d.body.balance).toBe("587980");
    });
    it("computes holdings and blocks overselling", async () => {
      const p = await auth()
        .post("/api/v1/portfolios")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ name: "Test portfolio" })
        .expect(201);
      portfolioId = p.body.id;
      const buy = {
        symbol: `T${suffix}`,
        name: "Test asset",
        quantity: "10",
        price: "100",
        fees: "10",
        kind: "BUY",
        date,
      };
      await auth()
        .post(`/api/v1/portfolios/${portfolioId}/trades`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send(buy)
        .expect(201);
      await auth()
        .post(`/api/v1/portfolios/${portfolioId}/trades`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ ...buy, kind: "SELL", quantity: "11" })
        .expect(400);
      const result = await auth()
        .get("/api/v1/portfolios")
        .set("Cookie", cookie)
        .expect(200);
      expect(result.body[0].holdings[0].cost).toBe("101000");
      await auth()
        .post(`/api/v1/portfolios/${portfolioId}/trades`)
        .set("Cookie", otherCookie)
        .set("Origin", origin)
        .send(buy)
        .expect(404);
    });
    it("returns only authorized financial facts through SSE", async () => {
      const result = await auth()
        .post("/api/v1/ai/chat")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ message: "How much did I spend this month?" })
        .expect(201);
      expect(result.text).toContain("120.30");
      expect(result.text).toContain("Deterministic demo");
      const metadata = result.text
        .split("\n")
        .find((l: string) => l.startsWith("data: "));
      conversationId = JSON.parse(metadata!.slice(6)).conversationId;
      await auth()
        .post("/api/v1/ai/chat")
        .set("Cookie", otherCookie)
        .set("Origin", origin)
        .send({ message: "Show data", conversationId })
        .expect(502);
      const h = await auth()
        .get("/api/v1/ai/conversations")
        .set("Cookie", otherCookie)
        .expect(200);
      expect(h.body).toEqual([]);
    });
    it("enforces AI quota", async () => {
      await db.subscription.update({
        where: { userId },
        data: { aiUsage: 30 },
      });
      await auth()
        .post("/api/v1/ai/chat")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ message: "spending" })
        .expect(502);
    });
    it("returns exact contribution-only forecasts", async () => {
      const r = await auth()
        .post("/api/v1/analytics/forecast")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ monthly: "15000", initial: "1000", months: 12 })
        .expect(201);
      expect(r.body.points.at(-1).value).toBe("18100000");
    });
    it("resets passwords, invalidates sessions, and logs out", async () => {
      const reset = await auth()
        .post("/api/v1/auth/forgot-password")
        .set("Origin", origin)
        .send({ email: `integration-${suffix}@example.test` })
        .expect(201);
      const token = new URL(reset.body.resetLink).searchParams.get("token");
      await auth()
        .post("/api/v1/auth/reset-password")
        .set("Origin", origin)
        .send({ token, password: "ChangedPassword2026!" })
        .expect(201);
      await auth().get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
      const login = await auth()
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({
          email: `integration-${suffix}@example.test`,
          password: "ChangedPassword2026!",
        })
        .expect(201);
      cookie = login.headers["set-cookie"][0].split(";")[0];
      await auth()
        .post("/api/v1/auth/logout")
        .set("Origin", origin)
        .set("Cookie", cookie)
        .send({})
        .expect(201);
      await auth().get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
    });
  },
);
