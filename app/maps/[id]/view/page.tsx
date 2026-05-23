import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MapViewer } from "@/components/maps/MapViewer";
import type { TravelMap, MapPoint, MapDay, MapLine } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("maps").select("title").eq("id", id).single();
  return { title: data?.title ? `${data.title} — ビューア` : "マップビューア" };
}

export default async function MapViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const user = await getCurrentUser();

  const supabase = await createClient();

  // オーナーまたは公開マップのみ閲覧可
  const { data: map } = await supabase
    .from("maps")
    .select("*")
    .eq("id", id)
    .or(user ? `user_id.eq.${user.id},is_public.eq.true` : "is_public.eq.true")
    .single();

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
  const initialIndex = Math.max(0, parseInt(p ?? "0", 10) - 1);

  return (
    <MapViewer
      points={pts}
      days={dys}
      lines={lns}
      initialIndex={initialIndex}
      mapTitle={m.title}
      isOwner={user?.id === m.user_id}
      mapId={id}
    />
  );
}
