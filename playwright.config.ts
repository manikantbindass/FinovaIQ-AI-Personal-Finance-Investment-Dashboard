import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    reducedMotion: "reduce",
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @finovaiq/api dev",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: "pnpm --filter @finovaiq/web start",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
