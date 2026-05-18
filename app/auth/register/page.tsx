"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, signInWithOAuth } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, null);

  if (state?.success) {
    return (
      <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">📧</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            確認メールを送信しました
          </h2>
          <p className="text-sm text-gray-500">
            メールに記載のリンクをクリックして登録を完了してください。
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
        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
          アカウント作成
        </h1>

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
          <Input
            id="password"
            name="password"
            type="password"
            label="パスワード"
            placeholder="8文字以上"
            required
            autoComplete="new-password"
          />

          <Button type="submit" loading={pending} className="mt-2 w-full">
            登録する
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-sm text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          または
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex flex-col gap-3">
          <form action={async () => { await signInWithOAuth("apple"); }}>
            <Button type="submit" variant="secondary" className="w-full">
              🍎 Appleで登録
            </Button>
          </form>
          <form action={async () => { await signInWithOAuth("google"); }}>
            <Button type="submit" variant="secondary" className="w-full">
              G Googleで登録
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          登録することで
          <Link href="/terms" className="underline">
            利用規約
          </Link>
          および
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなされます。
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-purple-600"
          >
            すでにアカウントをお持ちの方
          </Link>
        </div>
      </div>
    </main>
  );
}
