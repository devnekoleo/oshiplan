import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanResult } from "@/components/plans/PlanResult";
import { formatDate } from "@/lib/utils";
import type { Plan } from "@/types";

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!plan) notFound();

  const p = plan as Plan;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-xs text-gray-400">OshiPlan で作成された遠征プラン</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{p.event_name}</h1>
        <p className="text-sm text-gray-500">
          📅 {formatDate(p.event_date)} ・ {p.venue_name} ・ {p.departure}発
        </p>
      </div>

      <PlanResult plan={p} />

      <div className="mt-8 rounded-xl bg-purple-50 px-4 py-4 text-center">
        <p className="mb-3 text-sm text-purple-800 font-medium">
          OshiPlanで自分の遠征プランを作ってみよう（無料）
        </p>
        <Link
          href="/plans/new"
          className="inline-block rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
        >
          🎯 プランを作る
        </Link>
      </div>
    </main>
  );
}
