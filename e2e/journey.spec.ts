import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const password = "BrowserJourney2026!";
async function navigate(page: Page, name: string) {
  const opener = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await opener.isVisible()) await opener.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("register → finances → portfolio → authorized copilot → logout → login", async ({
  page,
}) => {
  const email = `browser-${Date.now()}@example.test`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Browser Tester");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Browser." }),
  ).toBeVisible();
  await navigate(page, "Accounts");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await page.getByLabel("Account name").fill("Journey bank");
  await page.getByLabel("Opening balance (₹)").fill("1000");
  await save(page);
  await expect(
    page.getByRole("heading", { name: "Journey bank" }),
  ).toBeVisible();
  await navigate(page, "Transactions");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Merchant or description").fill("Journey salary");
  await page.getByLabel("Transaction type").selectOption("INCOME");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("5000.10");
  await page.getByLabel("Category", { exact: true }).selectOption("salary");
  await save(page);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Merchant or description").fill("Journey cafe");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("100.20");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("food-dining");
  await save(page);
  await expect(page.getByText("Journey cafe", { exact: true })).toBeVisible();
  await navigate(page, "Budgets");
  await page.getByRole("button", { name: "Set budget", exact: true }).click();
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("food-dining");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("200");
  await save(page);
  await expect(
    page.getByRole("heading", { name: "Food & dining", exact: true }),
  ).toBeVisible();
  await navigate(page, "Overview");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Monthly income" })
      .getByText("₹5,000.10", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Monthly expenses" })
      .getByText("₹100.20", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Available balance" })
      .getByText("₹5,899.90", { exact: true }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await navigate(page, "Portfolio");
  await page.getByRole("button", { name: "New portfolio" }).click();
  await page.getByLabel("Portfolio name").fill("Journey portfolio");
  await save(page);
  await page.getByRole("button", { name: "Record trade" }).click();
  await page.getByLabel("Asset symbol (for example DEMO)").fill("JOURNEY");
  await page
    .getByLabel("Asset name", { exact: true })
    .fill("Fictional journey asset");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await page.getByLabel("Price per unit / total dividend (₹)").fill("100");
  await save(page);
  await expect(
    page.getByRole("cell", { name: "₹1,000.00", exact: true }),
  ).toBeVisible();
  await navigate(page, "AI Copilot");
  await page
    .getByLabel("Ask a financial question")
    .fill("How much did I spend this month?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText("100.20");
  await expect(page.locator(".chat-message.assistant")).toContainText(
    "Deterministic demo",
  );
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in to FinovaIQ" }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to FinovaIQ" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Browser." }),
  ).toBeVisible();
});
test("mobile demo navigation, responsive layout, and accessibility", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("demo@finovaiq.test");
  await page.getByLabel("Password", { exact: true }).fill("FinovaDemo2026!");
  await page.getByRole("button", { name: "Sign in to FinovaIQ" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Alex." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".metric-card").first()).toBeVisible();
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/mobile-dashboard.png",
    fullPage: true,
  });
  await navigate(page, "Goals");
  await expect(
    page.getByRole("heading", { name: "Emergency fund", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(lightA11y.violations).toEqual([]);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate(page, "Overview");
  await expect(page.locator(".metric-card").first()).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
});
