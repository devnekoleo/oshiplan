"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path
          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
          fill="#EA4335"
        />
      </g>
    </svg>
  );
}

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/maps`,
      },
    });
    if (error) {
      setGoogleError(error.message);
      setGoogleLoading(false);
    }
  };

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
            className="mt-6 inline-block text-sm text-blue-600 hover:underline"
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

        {(state?.error || googleError) && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {state?.error || googleError}
          </div>
        )}

        {/* Google OAuth — always shown */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || pending}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          {googleLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <GoogleIcon />
          )}
          Google で登録・ログイン
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-sm text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          またはメールで登録
          <div className="h-px flex-1 bg-gray-200" />
        </div>

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
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            すでにアカウントをお持ちの方
          </Link>
        </div>
      </div>
    </main>
  );
}
