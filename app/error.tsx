"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl mb-4">😢</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        ご不便をおかけして申し訳ありません。問題は記録されました。
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          再試行する
        </button>
        <a
          href="/maps"
          className="rounded-full border border-gray-200 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          マイマップへ
        </a>
      </div>
    </main>
  );
}
