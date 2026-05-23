import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: {
    default: "Viamaps | 旅をもっと楽しく",
    template: "%s | Viamaps",
  },
  description:
    "地図にピンを立てて、写真と説明をつけながら旅を記録・計画。ポイント間をスムーズに移動できる新感覚マップサービス。",
  keywords: ["旅行", "旅行計画", "地図", "マイマップ", "旅行記録"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Viamaps",
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
