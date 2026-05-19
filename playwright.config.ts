import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://oshiplan.vercel.app";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
  ],
  // ローカルサーバー起動はオプション（PLAYWRIGHT_BASE_URL が未設定かつ開発時のみ）
  ...(BASE_URL.includes("localhost")
    ? {
        webServer: {
          command: "npm run dev",
          url: BASE_URL,
          reuseExistingServer: true,
        },
      }
    : {}),
});
