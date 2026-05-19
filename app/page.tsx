import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCost, formatDate, daysUntil } from "@/lib/utils";
import type { Plan } from "@/types";

export default async function HomePage() {
  const user = await getCurrentUser();
  let nextPlan: Plan | null = null;
  let recentPlans: Plan[] = [];

  if (user) {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: upcoming } = await supabase
      .from("plans")
      .select("*")
      .eq("user_id", user.id)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(1);

    nextPlan = (upcoming?.[0] as Plan) ?? null;

    const { data: recent } = await supabase
      .from("plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    recentPlans = (recent ?? []) as Plan[];
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          推し活遠征プランを
          <br />
          <span className="text-purple-600">AIが3分で作る。無料で。</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-600">
          公演名・会場・出発地を入れるだけで交通・宿泊・物販情報を自動生成。
        </p>
        <Link
          href="/plans/new"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-purple-700"
        >
          🎯 遠征プランを作る（無料）
        </Link>
      </section>

      {/* ログイン済みユーザー: 次の遠征 */}
      {user && nextPlan && (
        <section className="mx-auto max-w-2xl px-4 pb-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">▼ 次の遠征</h2>
          <Link href={`/plans/${nextPlan.id}`} className="block">
            <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm transition hover:border-purple-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400">
                    📅 {formatDate(nextPlan.event_date)}
                    {nextPlan.event_time && ` ${nextPlan.event_time}`}
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">{nextPlan.event_name}</p>
                  <p className="text-sm text-gray-500">{nextPlan.venue_name}</p>
                  {nextPlan.plan_json?.estimated_cost && (
                    <p className="text-sm text-purple-600">
                      概算 {formatCost(nextPlan.plan_json.estimated_cost)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-purple-600">
                    {daysUntil(nextPlan.event_date) === 0
                      ? "今日！"
                      : `あと${daysUntil(nextPlan.event_date)}日`}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ログイン済みユーザー: 最近のプラン */}
      {user && recentPlans.length > 0 && (
        <section className="mx-auto max-w-2xl px-4 pb-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500">▼ 最近のプラン</h2>
            <Link href="/plans" className="text-sm text-purple-600 hover:underline">すべて見る</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentPlans.map((plan) => (
              <Link key={plan.id} href={`/plans/${plan.id}`} className="block">
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-purple-200">
                  <p className="text-xs text-gray-400">{formatDate(plan.event_date)}</p>
                  <p className="font-medium text-gray-900 truncate">{plan.event_name}</p>
                  <p className="text-sm text-gray-500 truncate">{plan.venue_name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "✅", text: "完全無料" },
            { icon: "✅", text: "ログイン不要で試せる" },
            { icon: "✅", text: "物販・聖地情報も含む" },
            { icon: "✅", text: "しおり共有機能" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="text-xl">{f.icon}</span>
              <span className="font-medium text-gray-800">{f.text}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
