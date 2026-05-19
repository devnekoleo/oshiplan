"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

async function updateProfile(
  _prev: { error: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error: string; success?: boolean } | null> {
  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: formData.get("display_name") || undefined,
      home_station: formData.get("home_station") || undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { error: data.error?.message ?? "更新に失敗しました" };
  }
  return { error: "", success: true };
}

export default function ProfileEditPage() {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [displayName, setDisplayName] = useState("");
  const [homeStation, setHomeStation] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        setDisplayName(data.display_name ?? "");
        setHomeStation(data.home_station ?? "");
      });
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600">← 戻る</Link>
        <h1 className="text-xl font-bold text-gray-900">プロフィール編集</h1>
      </div>

      {state?.success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          保存しました ✅
        </div>
      )}
      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <Input
          id="display_name" name="display_name" label="表示名"
          placeholder="推し活太郎" maxLength={30}
          value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          id="home_station" name="home_station" label="最寄り駅"
          placeholder="名古屋駅（プラン生成時の出発地デフォルト）" maxLength={50}
          value={homeStation} onChange={(e) => setHomeStation(e.target.value)}
        />
        <Button type="submit" loading={pending} className="mt-2 w-full">保存する</Button>
      </form>
    </main>
  );
}
