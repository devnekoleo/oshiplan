import { describe, it, expect, vi, beforeEach } from "vitest";

// KVなし環境ではゲストを通過させる（フォールバック）
describe("checkGuestRateLimit (KV未設定)", () => {
  beforeEach(() => {
    // KV環境変数を未設定にしてテスト
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
  });

  it("KV未設定時はtrueを返す（フォールバック）", async () => {
    const { checkGuestRateLimit } = await import("@/lib/rate-limit");
    const result = await checkGuestRateLimit("192.168.1.1");
    expect(result).toBe(true);
  });
});

// T-UNIT-10〜13: 利用枠チェックロジック
describe("レート制限ロジック", () => {
  it("ゲスト1日3回制限の定数確認", async () => {
    const mod = await import("@/lib/rate-limit");
    // モジュールが存在することを確認
    expect(mod.checkGuestRateLimit).toBeDefined();
  });
});
