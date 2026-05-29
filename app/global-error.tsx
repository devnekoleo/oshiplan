"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>😢</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>エラーが発生しました</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "2rem" }}>
            問題は記録されました。
          </p>
          <a href="/" style={{ borderRadius: "9999px", background: "#2563eb", color: "white", padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
            ホームへ戻る
          </a>
        </main>
      </body>
    </html>
  );
}
