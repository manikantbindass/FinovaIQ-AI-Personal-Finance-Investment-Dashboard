import { test, expect } from "@playwright/test";

test("hosted demo login, persistent records, copilot, and logout", async ({
  page,
  baseURL,
}) => {
  const health = await page.request.get("/api/v1/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).database).toBe("connected");
  await page.goto("/");
  await page.getByLabel("Email address").fill("demo@finovaiq.test");
  await page.getByLabel("Password", { exact: true }).fill("FinovaDemo2026!");
  await page.getByRole("button", { name: "Sign in to FinovaIQ" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Alex." }),
  ).toBeVisible();
  await expect(page.locator(".metric-card").first()).toBeVisible();
  const merchant = `Deployment smoke ${Date.now()}`;
  let createdId: string | undefined;
  try {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Transactions", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .click();
    await page.getByLabel("Merchant or description").fill(merchant);
    await page.getByLabel("Amount (₹)", { exact: true }).fill("1.23");
    await page.getByLabel("Category", { exact: true }).selectOption("other");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const saved = await page.request.get(
      `/api/v1/transactions?search=${encodeURIComponent(merchant)}`,
    );
    expect(saved.status()).toBe(200);
    const result = await saved.json();
    createdId = result.items[0]?.id;
    expect(createdId).toBeTruthy();
    expect(result.items[0].amount).toBe("123");
    await page.reload();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Transactions", exact: true })
      .click();
    await page.getByLabel("Search merchants").fill(merchant);
    await expect(page.getByText(merchant, { exact: true })).toBeVisible();
  } finally {
    if (createdId) {
      const removed = await page.request.delete(
        `/api/v1/transactions/${createdId}`,
        { headers: { Origin: baseURL! } },
      );
      expect(removed.status()).toBe(200);
    }
  }
  const cleanupCheck = await page.request.get(
    `/api/v1/transactions?search=${encodeURIComponent(merchant)}`,
  );
  expect((await cleanupCheck.json()).items).toEqual([]);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "AI Copilot", exact: true })
    .click();
  await page
    .getByLabel("Ask a financial question")
    .fill("How much did I spend this month?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText(
    "Deterministic demo",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/hosted-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in to FinovaIQ" }),
  ).toBeVisible();
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
});
