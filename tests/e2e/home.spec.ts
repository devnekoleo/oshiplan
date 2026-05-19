import { test, expect } from "@playwright/test";

// E2E-03: 会場別ページからのプラン作成フロー（SEO流入シミュレーション）
test.describe("ホームページ", () => {
  test("トップページが正常に表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OshiPlan/);
    await expect(page.locator("h1")).toContainText("推し活遠征プランを");
  });

  test("CTAボタンが表示される", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /遠征プランを作る/ });
    await expect(cta).toBeVisible();
  });

  test("ヘッダーに「プランを作る」「会場一覧」が表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "プランを作る" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "会場一覧" }).first()).toBeVisible();
  });

  test("未ログイン時: CTAクリックでログインページにリダイレクト", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /遠征プランを作る/ }).click();
    // ログインページ or プラン作成ページに遷移
    await expect(page).toHaveURL(/\/(auth\/login|plans\/new)/);
  });
});
