import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          推し活遠征プランを
          <br />
          <span className="text-purple-600">AIが3分で作る。無料で。</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gray-600">
          公演名・会場・出発地を入れるだけで交通・宿泊・物販情報を自動生成。
        </p>
        <Link
          href="/plans/new"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-purple-700"
        >
          🎯 遠征プランを作る（無料）
        </Link>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "✅", text: "完全無料" },
              { icon: "✅", text: "ログイン不要で試せる" },
              { icon: "✅", text: "物販・聖地情報も含む" },
              { icon: "✅", text: "しおり共有機能" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <span className="text-xl">{f.icon}</span>
                <span className="font-medium text-gray-800">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
