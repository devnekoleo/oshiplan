import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChecklistEditor } from "@/components/maps/ChecklistEditor";
import type { TravelMap, ChecklistItem } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("maps").select("title").eq("id", id).single();
  return { title: data?.title ? `${data.title} — チェックリスト` : "チェックリスト" };
}

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: map } = await supabase
    .from("maps")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!map) notFound();

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("map_id", id)
    .order("order_index", { ascending: true });

  const m = map as TravelMap;
  const checklistItems = (items ?? []) as ChecklistItem[];

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* ツールバー */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/maps/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← エディタに戻る
          </Link>
          <h1 className="font-semibold text-gray-900 truncate max-w-48 sm:max-w-xs">{m.title}</h1>
          <span className="text-xs text-gray-500">チェックリスト 📋</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ChecklistEditor mapId={id} initialItems={checklistItems} />
      </div>
    </div>
  );
}
