import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "主要ライブ会場一覧 | OshiPlan",
  description: "全国主要ライブ会場からAIで遠征プランを自動生成。東京ドーム・横浜アリーナ・さいたまスーパーアリーナ等。",
};

export default async function VenuesPage() {
  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("slug, name, prefecture, capacity")
    .order("prefecture")
    .order("name");

  const byPref: Record<string, typeof venues> = {};
  (venues ?? []).forEach((v) => {
    if (!byPref[v.prefecture]) byPref[v.prefecture] = [];
    byPref[v.prefecture]!.push(v);
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">主要ライブ会場から遠征プランを作る</h1>
      <p className="mb-8 text-sm text-gray-500">会場を選んでAIが自動で遠征プランを生成します（無料）</p>

      {Object.keys(byPref).length === 0 ? (
        <p className="text-gray-400">会場データを読み込み中...</p>
      ) : (
        Object.entries(byPref).map(([pref, pvenues]) => (
          <section key={pref} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">▼ {pref}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(pvenues ?? []).map((v) => (
                <Link key={v.slug} href={`/venue/${v.slug}`} className="block">
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-purple-200 hover:shadow-md">
                    <p className="font-medium text-gray-900">{v.name}</p>
                    {v.capacity && (
                      <p className="text-xs text-gray-400">収容 {v.capacity.toLocaleString()}人</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
