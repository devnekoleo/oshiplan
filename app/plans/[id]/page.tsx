import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PlanResult } from "@/components/plans/PlanResult";
import { ShareButton } from "@/components/plans/ShareButton";
import { PlanOfflineCache } from "@/components/plans/PlanOfflineCache";
import type { Plan } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("event_name").eq("id", id).single();
  return { title: data?.event_name ?? "プラン詳細" };
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirectTo=/plans/${id}`);

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !plan) notFound();

  const p = plan as Plan;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/plans" className="text-gray-400 hover:text-gray-600">← 戻る</Link>
        <div className="flex gap-2">
          <Link href={`/plans/${id}/edit`}>
            <button className="rounded-full border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
              ✏️ 編集
            </button>
          </Link>
          <ShareButton planId={id} currentToken={p.share_token} />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{p.event_name}</h1>
        <p className="text-sm text-gray-500">
          📅 {formatDate(p.event_date)}
          {p.event_time && ` ${p.event_time}`} ・ {p.venue_name} ・ {p.departure}発
        </p>
      </div>

      {/* オフラインキャッシュ: localStorageに保存して会場でも閲覧可能に */}
      <PlanOfflineCache plan={p} />
      <PlanResult plan={p} />
    </main>
  );
}
