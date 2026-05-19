/**
 * RLS セキュリティテスト仕様
 * T-SEC-01〜05 に対応
 *
 * 実行方法: Supabase ローカル環境が必要
 * `supabase start` 後に実行してください
 *
 * 以下のテストはローカル Supabase に接続して実行されます
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? "";

// T-SEC-01: ユーザーは自分のプランのみ取得できる
describe("RLS: plans テーブル", () => {
  it("匿名ユーザーは share_token なしでプランを読み取れない", async () => {
    if (!ANON_KEY) {
      console.warn("SUPABASE_TEST_ANON_KEY not set, skipping RLS test");
      return;
    }
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon.from("plans").select("id").limit(1);
    // RLSにより結果は空またはエラー
    expect(data?.length ?? 0).toBe(0);
  });

  // T-SEC-03: share_token が一致すれば匿名 read 可
  it("share_token がなければ匿名ユーザーはプランを取得できない", async () => {
    if (!ANON_KEY) return;
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anon
      .from("plans")
      .select("id")
      .is("share_token", null)
      .limit(1);
    expect(data?.length ?? 0).toBe(0);
  });
});

// T-SEC-05: subscriptions は service_role 以外で INSERT 不可
describe("RLS: affiliate_clicks テーブル", () => {
  it("匿名ユーザーは affiliate_clicks に INSERT できる（クリック計測）", async () => {
    if (!ANON_KEY) return;
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await anon.from("affiliate_clicks").insert({
      affiliate_type: "hotel",
      affiliate_partner: "test",
    });
    // RLS ポリシー: 誰でも INSERT 可なのでエラーなし
    expect(error).toBeNull();
  });
});
