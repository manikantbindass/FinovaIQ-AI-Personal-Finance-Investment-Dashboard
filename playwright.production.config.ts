import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.LIVE_BASE_URL;
if (!baseURL || !baseURL.startsWith("https://")) {
  throw new Error("Set LIVE_BASE_URL to the deployed HTTPS FinovaIQ origin.");
}
export default defineConfig({
  testDir: "./e2e-production",
  timeout: 180000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
});
