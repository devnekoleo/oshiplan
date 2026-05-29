import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MapSettingsForm } from "./MapSettingsForm";
import type { TravelMap } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("maps").select("title").eq("id", id).single();
  return { title: `設定 — ${data?.title ?? "マップ"}` };
}

export default async function MapSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const m = map as TravelMap;

  return (
    <MapSettingsForm
      mapId={id}
      shareToken={m.share_token}
      initialTitle={m.title}
      initialDescription={m.description ?? ""}
      initialIsPublic={m.is_public}
    />
  );
}
