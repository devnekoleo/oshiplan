"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, null);

  if (state?.success) {
    return (
      <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">📧</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            メールを送信しました
          </h2>
          <p className="text-sm text-gray-500">
            パスワード再設定のリンクをメールで送信しました。
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-purple-600 hover:underline"
          >
            ログイン画面へ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          パスワードをリセット
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          登録済みのメールアドレスを入力してください
        </p>

        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <form action={action} className="flex flex-col gap-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="メールアドレス"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Button type="submit" loading={pending} className="mt-2 w-full">
            送信する
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-purple-600"
          >
            ← ログイン画面に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
