import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("venues").select("name").eq("slug", slug).single();
  if (!data) return { title: "会場が見つかりません" };
  return {
    title: `${data.name} 遠征プラン・宿泊 | OshiPlan`,
    description: `${data.name}への推し活遠征プランをAIが自動生成。周辺ホテル・アクセス・物販情報を一括確認。`,
  };
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!venue) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/venues" className="mb-4 block text-sm text-gray-400 hover:text-gray-600">
        ← 会場一覧
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">{venue.name} への遠征プランを作る</h1>
      <p className="mb-6 text-sm text-gray-500">
        📍 {venue.prefecture} {venue.address && `・${venue.address}`}
        {venue.capacity && ` ・ 収容 ${venue.capacity.toLocaleString()}人`}
      </p>

      <Link
        href={`/plans/new?venue=${encodeURIComponent(venue.name)}`}
        className="mb-8 flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-purple-700"
      >
        🎯 {venue.name}公演の遠征プランを作る（無料）
      </Link>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h2 className="mb-2 font-semibold text-gray-800">💡 遠征のヒント</h2>
        <ul className="flex flex-col gap-1 text-sm text-gray-600">
          <li>• 物販は開場2〜3時間前から並ぶのが一般的</li>
          <li>• 当日はコインロッカーが混むため早めの確保を推奨</li>
          <li>• 公演後の最終交通手段を事前に確認しておきましょう</li>
        </ul>
      </div>
    </main>
  );
}
