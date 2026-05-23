import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MapEditor } from "@/components/maps/MapEditor";
import type { TravelMap, MapPoint, MapDay, MapLine } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("maps").select("title").eq("id", id).single();
  return { title: data?.title ?? "マップエディタ" };
}

export default async function MapEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: map } = await supabase
    .from("maps").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!map) notFound();

  const [{ data: points }, { data: days }, { data: linesRaw }] = await Promise.all([
    supabase.from("points").select("*").eq("map_id", id).order("order_index", { ascending: true }),
    supabase.from("map_days").select("*").eq("map_id", id).order("day_number", { ascending: true }),
    supabase.from("map_lines").select("*").eq("map_id", id).order("created_at", { ascending: true }),
  ]);

  const m   = map as TravelMap;
  const pts = (points ?? []) as MapPoint[];
  const dys = (days ?? []) as MapDay[];
  const lns = (linesRaw ?? []) as MapLine[];

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* ツールバー */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/maps" className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">
            ← マイマップ
          </Link>
          <h1 className="font-semibold text-gray-900 truncate max-w-40 sm:max-w-xs">{m.title}</h1>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {m.is_public ? "公開中" : "非公開"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/maps/${id}/checklist`}
            className="hidden sm:flex rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            📋 チェックリスト
          </Link>
          {pts.length > 0 && (
            <Link href={`/maps/${id}/view`}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
              ▶ ビューア
            </Link>
          )}
          <Link href={`/maps/${id}/settings`}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            設定
          </Link>
        </div>
      </div>

      {/* マップエディタ */}
      <div className="flex-1 overflow-hidden">
        <MapEditor mapId={id} initialPoints={pts} initialDays={dys} initialLines={lns} />
      </div>
    </div>
  );
}
