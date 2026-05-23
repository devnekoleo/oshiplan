"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createMap } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function NewMapPage() {
  const [state, action, pending] = useActionState(createMap, null);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/maps" className="text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">新しいマップ</h1>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {state?.error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <Input
          id="title"
          name="title"
          label="マップ名 *"
          placeholder="例: 京都旅行 2026"
          required
          maxLength={100}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            説明（任意）
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="このマップについての説明..."
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        <Button type="submit" loading={pending} className="w-full">
          マップを作成して編集開始
        </Button>
      </form>
    </main>
  );
}
