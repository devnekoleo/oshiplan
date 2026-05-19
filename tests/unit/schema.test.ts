import { describe, it, expect } from "vitest";
import { PlanJsonSchema } from "@/lib/ai/schema";

const validPlan = {
  summary: "東京ドーム公演 1泊2日プラン",
  estimated_cost: 38000,
  itinerary: [
    { time: "07:30", action: "新幹線のぞみ乗車", cost: 11000 },
    { time: "18:00", action: "開演", cost: null },
  ],
  accommodation: {
    name: "東京ドームホテル",
    area: "後楽園",
    price_approx: 8000,
    affiliate_links: { rakuten: null },
  },
  transit: {
    outbound: {
      type: "shinkansen" as const,
      name: "のぞみ（名古屋→東京）",
      cost: 11000,
      duration_min: 100,
      booking_url: null,
    },
    return: null,
  },
  merch_line_advice: "14:00頃から並ぶ推奨",
  goods_links: [],
  tips: ["コインロッカーは早めに"],
};

// T-UNIT-01
describe("PlanJsonSchema", () => {
  it("正常なplan_jsonはバリデーション通過", () => {
    expect(PlanJsonSchema.safeParse(validPlan).success).toBe(true);
  });

  // T-UNIT-02
  it("itineraryが空配列は失敗", () => {
    const result = PlanJsonSchema.safeParse({ ...validPlan, itinerary: [] });
    expect(result.success).toBe(false);
  });

  // T-UNIT-03
  it("time が0埋めなし形式は失敗", () => {
    const result = PlanJsonSchema.safeParse({
      ...validPlan,
      itinerary: [{ time: "7:30", action: "test", cost: null }],
    });
    expect(result.success).toBe(false);
  });

  // T-UNIT-04
  it("estimated_costが負数は失敗", () => {
    const result = PlanJsonSchema.safeParse({ ...validPlan, estimated_cost: -1 });
    expect(result.success).toBe(false);
  });

  // T-UNIT-05
  it("accommodationがnullは通過", () => {
    const result = PlanJsonSchema.safeParse({ ...validPlan, accommodation: null });
    expect(result.success).toBe(true);
  });

  // T-UNIT-06
  it("merch_line_adviceが501文字は失敗", () => {
    const result = PlanJsonSchema.safeParse({
      ...validPlan,
      merch_line_advice: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  // T-UNIT-07
  it("goods_linksが6件は失敗", () => {
    const result = PlanJsonSchema.safeParse({
      ...validPlan,
      goods_links: Array(6).fill({ name: "test", amazon_url: null }),
    });
    expect(result.success).toBe(false);
  });

  // T-UNIT-08
  it("tips が11件は失敗", () => {
    const result = PlanJsonSchema.safeParse({
      ...validPlan,
      tips: Array(11).fill("tip"),
    });
    expect(result.success).toBe(false);
  });

  it("affiliate_linksが不正URLは失敗", () => {
    const result = PlanJsonSchema.safeParse({
      ...validPlan,
      accommodation: {
        ...validPlan.accommodation,
        affiliate_links: { rakuten: "not-a-url" },
      },
    });
    expect(result.success).toBe(false);
  });
});
