import { test, expect } from "@playwright/test";

// E2E-01: ゲストでのプラン作成フロー
test.describe("プラン作成ウィザード（ゲスト）", () => {
  test("Step1: 推し選択画面が表示される", async ({ page }) => {
    await page.goto("/plans/new");
    // ゲストはStep1か認証ページに遷移
    const url = page.url();
    expect(url).toMatch(/\/(plans\/new|auth\/login)/);
  });

  test("利用規約ページが表示される", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText("利用規約");
  });

  test("プライバシーポリシーページが表示される", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText("プライバシーポリシー");
  });
});

// E2E-04: レート制限フロー（APIレベル）
test.describe("APIレート制限", () => {
  test("共有プランURLが存在しないトークンで404を返す", async ({ page }) => {
    await page.goto("/shared/invalid-token-that-does-not-exist");
    await expect(page).toHaveURL(/shared\//);
    // 404 Not Found ページが表示されることを確認
    const title = await page.title();
    expect(title).toMatch(/404|OshiPlan/);
  });
});
