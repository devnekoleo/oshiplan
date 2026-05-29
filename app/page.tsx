import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 text-6xl">📍</div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          旅を、地図で語ろう。
        </h1>
        <p className="mt-5 max-w-lg text-lg text-gray-600">
          ポイントを追加して写真と説明を付けるだけ。<br />
          <span className="font-semibold text-blue-600">← → で地図を開かずにスムーズに移動。</span>
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={user ? "/maps/new" : "/auth/register"}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            🗺️ マップを作る（無料）
          </Link>
          {user && (
            <Link
              href="/maps"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-4 text-base font-medium text-gray-700 transition hover:bg-gray-50"
            >
              マイマップを見る
            </Link>
          )}
        </div>
      </section>

      {/* 特徴 */}
      <section className="bg-gray-50 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900">
            Google マイマップと何が違う？
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: "⚡",
                title: "地図を開き直さない",
                desc: "← → ボタンでポイント間をアニメーション移動。ストレスゼロ。",
              },
              {
                icon: "📸",
                title: "写真＋説明をセットで",
                desc: "各ポイントに画像URLとメモを追加。旅の記録もプランも。",
              },
              {
                icon: "🔗",
                title: "リンクで簡単共有",
                desc: "公開リンクを送るだけ。相手はアプリ不要でそのまま閲覧。",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-14 text-center">
        <p className="mb-4 text-gray-600">無料で今すぐはじめられます</p>
        <Link
          href={user ? "/maps/new" : "/auth/register"}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
        >
          {user ? "新しいマップを作る →" : "無料で始める →"}
        </Link>
      </section>
    </main>
  );
}
