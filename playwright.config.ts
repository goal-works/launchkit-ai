import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3003",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3003/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
