"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signInWithOAuth } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Apple/Google OAuthはSupabase側で設定が必要（未設定時はfalse）
const OAUTH_ENABLED = process.env.NEXT_PUBLIC_OAUTH_ENABLED === "true";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
          🎵 OshiPlan にログイン
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
            autoComplete="current-password"
          />

          <Button type="submit" loading={pending} className="mt-2 w-full">
            ログイン
          </Button>
        </form>

        {OAUTH_ENABLED && (
          <>
            <div className="my-6 flex items-center gap-3 text-sm text-gray-400">
              <div className="h-px flex-1 bg-gray-200" />
              または
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="flex flex-col gap-3">
              <form action={async () => { await signInWithOAuth("apple"); }}>
                <Button type="submit" variant="secondary" className="w-full">
                  🍎 Appleでログイン
                </Button>
              </form>
              <form action={async () => { await signInWithOAuth("google"); }}>
                <Button type="submit" variant="secondary" className="w-full">
                  G Googleでログイン
                </Button>
              </form>
            </div>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500">
          <Link href="/auth/reset-password" className="hover:text-purple-600">
            パスワードを忘れた方はこちら
          </Link>
          <Link href="/auth/register" className="hover:text-purple-600">
            アカウントをお持ちでない方へ
          </Link>
        </div>
      </div>
    </main>
  );
}
