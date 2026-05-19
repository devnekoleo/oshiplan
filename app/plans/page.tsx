import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCost, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Plan } from "@/types";

export const metadata = { title: "マイプラン" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/plans");

  const { type = "upcoming" } = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("plans")
    .select("*")
    .eq("user_id", user.id)
    .order("event_date", { ascending: type === "upcoming" });

  if (type === "upcoming") {
    query = query.gte("event_date", today);
  } else {
    query = query.lt("event_date", today);
  }

  const { data: plans } = await query;
  const planList = (plans ?? []) as Plan[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マイプラン</h1>
        <Link href="/plans/new">
          <Button size="sm">＋ 新しく作る</Button>
        </Link>
      </div>

      {/* タブ */}
      <div className="mb-6 flex gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <Link key={t} href={`/plans?type=${t}`}>
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                type === t
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "upcoming" ? "予定の遠征" : "過去の遠征"}
            </button>
          </Link>
        ))}
      </div>

      {planList.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="プランがありません"
          description="遠征プランを作成してみましょう"
          actionLabel="プランを作る"
          actionHref="/plans/new"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {planList.map((plan) => (
            <li key={plan.id}>
              <Link href={`/plans/${plan.id}`} className="block">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md">
                  <p className="text-xs text-gray-400">📅 {formatDate(plan.event_date)}</p>
                  <p className="mt-1 font-semibold text-gray-900">{plan.event_name}</p>
                  <p className="text-sm text-gray-500">
                    {plan.venue_name} ／ {plan.departure}発
                  </p>
                  {plan.plan_json?.estimated_cost && (
                    <p className="text-sm text-purple-600">
                      概算 {formatCost(plan.plan_json.estimated_cost)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
