"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PlanResult } from "@/components/plans/PlanResult";
import type { Plan } from "@/types";

export default function PlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [merchAdvice, setMerchAdvice] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then((r) => r.json())
      .then((data: Plan) => {
        setPlan(data);
        setMerchAdvice(data.plan_json?.merch_line_advice ?? "");
        setTips(data.plan_json?.tips ?? []);
      });
  }, [id]);

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_json: {
            ...plan.plan_json,
            merch_line_advice: merchAdvice || null,
            tips,
          },
        }),
      });
      if (res.ok) router.push(`/plans/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このプランを削除しますか？")) return;
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    router.push("/plans");
  };

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/plans/${id}`} className="text-gray-400 hover:text-gray-600">← 戻る</Link>
        <h1 className="font-bold text-gray-900">プランを編集</h1>
        <Button onClick={handleSave} loading={saving} size="sm">保存する</Button>
      </div>

      <PlanResult plan={plan} />

      {/* 編集可能フィールド */}
      <div className="mt-8 flex flex-col gap-6 border-t border-gray-100 pt-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            🛍️ 物販アドバイス
          </label>
          <textarea
            value={merchAdvice}
            onChange={(e) => setMerchAdvice(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">💡 Tips</label>
          <div className="flex flex-col gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={tip}
                  onChange={(e) => setTips((prev) => prev.map((t, j) => j === i ? e.target.value : t))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={() => setTips((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
            {tips.length < 10 && (
              <button
                type="button"
                onClick={() => setTips((prev) => [...prev, ""])}
                className="text-sm text-purple-600 hover:underline"
              >
                ＋ Tipを追加
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-700"
        >
          このプランを削除する
        </button>
      </div>
    </main>
  );
}
