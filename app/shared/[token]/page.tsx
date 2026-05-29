import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { MapViewer } from "@/components/maps/MapViewer";
import type { TravelMap, MapPoint, MapDay, MapLine } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("maps")
    .select("title, description")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  if (!data) return { title: "共有マップ | Viamaps" };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "oshiplan.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}/shared/${token}`;

  const title = `${data.title} — Viamaps`;
  const description = data.description ?? `${data.title}の旅行マップ — Viamapsで作成`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Viamaps",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
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
