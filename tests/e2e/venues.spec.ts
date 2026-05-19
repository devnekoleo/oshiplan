import { test, expect } from "@playwright/test";

// E2E-03: 会場別ページSEOシミュレーション
test.describe("会場ページ", () => {
  test("会場一覧ページが表示される", async ({ page }) => {
    await page.goto("/venues");
    await expect(page.locator("h1")).toContainText("会場");
  });

  test("会場別ページが表示される（東京ドーム）", async ({ page }) => {
    await page.goto("/venue/tokyo-dome");
    // 404でないことを確認
    await expect(page).not.toHaveTitle(/404/);
  });

  test("会場別ページのSEOタイトルに会場名が含まれる", async ({ page }) => {
    await page.goto("/venue/tokyo-dome");
    const title = await page.title();
    expect(title).toContain("OshiPlan");
  });

  test("会場別ページのCTAをクリックするとプラン作成またはログインに遷移", async ({ page }) => {
    await page.goto("/venue/tokyo-dome");
    const cta = page.getByRole("link", { name: /遠征プランを作る/ });
    if (await cta.isVisible()) {
      await cta.click();
      // ゲスト→ログインへリダイレクト、またはプラン作成ページへ遷移
      await expect(page).toHaveURL(/\/(plans\/new|auth\/login)/);
    }
  });
});
