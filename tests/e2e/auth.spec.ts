import { test, expect } from "@playwright/test";

// E2E-01: 認証フロー
test.describe("認証画面", () => {
  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("h1")).toContainText("ログイン");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("新規登録ページが表示される", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.locator("h1")).toContainText("アカウント作成");
  });

  test("パスワードリセットページが表示される", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(page.locator("h1")).toContainText("パスワード");
  });

  test("ログインページに「Appleでログイン」ボタンがある", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /Appleでログイン/ })).toBeVisible();
  });

  test("ログインページに「Googleでログイン」ボタンがある", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /Googleでログイン/ })).toBeVisible();
  });
});
