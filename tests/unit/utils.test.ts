import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatCost, formatDate, daysUntil } from "@/lib/utils";

describe("formatCost", () => {
  it("数値を円表示にフォーマット", () => {
    expect(formatCost(38000)).toBe("¥38,000");
    expect(formatCost(0)).toBe("¥0");
    expect(formatCost(1000000)).toBe("¥1,000,000");
  });
});

describe("formatDate", () => {
  it("ISO日付文字列を日本語形式にフォーマット", () => {
    const result = formatDate("2026-08-15");
    expect(result).toContain("2026");
    expect(result).toContain("8");
    expect(result).toContain("15");
  });
});

describe("daysUntil", () => {
  it("未来の日付は正の整数を返す", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    expect(daysUntil(tomorrowStr)).toBeGreaterThanOrEqual(1);
  });

  it("十分先の未来は大きな正の整数を返す", () => {
    expect(daysUntil("2099-12-31")).toBeGreaterThan(100);
  });

  it("戻り値は整数", () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const result = daysUntil(nextWeek.toISOString().split("T")[0]);
    expect(Number.isInteger(result)).toBe(true);
  });
});
