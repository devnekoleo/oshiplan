import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: {
    default: "OshiPlan（オシプラン）| 推し活遠征プランナー",
    template: "%s | OshiPlan",
  },
  description:
    "推し活遠征プランをAIが3分で自動生成。交通・宿泊・物販情報を一括確認。完全無料。",
  keywords: ["推し活", "遠征", "プラン", "AI", "宿泊", "チケット"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "OshiPlan",
  },
};

export default function RootLayout({
  children,
}: {
  children: import("react").ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white">
        <Header />
        {children}
      </body>
    </html>
  );
}
