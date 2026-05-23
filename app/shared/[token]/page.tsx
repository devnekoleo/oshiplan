import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapViewer } from "@/components/maps/MapViewer";
import type { TravelMap, MapPoint, MapDay, MapLine } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("maps").select("title").eq("share_token", token).eq("is_public", true).single();
  return { title: data?.title ? `${data.title} — Viamaps` : "共有マップ | Viamaps" };
}

export default async function SharedMapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: map } = await supabase
    .from("maps")
    .select("*")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  if (!map) notFound();

  const [{ data: points }, { data: days }, { data: linesRaw }] = await Promise.all([
    supabase.from("points").select("*").eq("map_id", map.id).order("order_index", { ascending: true }),
    supabase.from("map_days").select("*").eq("map_id", map.id).order("day_number", { ascending: true }),
    supabase.from("map_lines").select("*").eq("map_id", map.id).order("created_at", { ascending: true }),
  ]);

  const m   = map as TravelMap;
  const pts = (points ?? []) as MapPoint[];
  const dys = (days ?? []) as MapDay[];
  const lns = (linesRaw ?? []) as MapLine[];

  return (
    <MapViewer
      points={pts}
      days={dys}
      lines={lns}
      mapTitle={m.title}
      isOwner={false}
    />
  );
}
