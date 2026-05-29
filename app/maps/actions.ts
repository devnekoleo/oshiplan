"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createMap(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title || title.length < 1 || title.length > 100)
    return { error: "タイトルは1〜100文字で入力してください" };

  const { data: map, error } = await supabase
    .from("maps")
    .insert({ user_id: user.id, title, description: description || null })
    .select()
    .single();

  if (error || !map) return { error: "マップの作成に失敗しました" };

  revalidatePath("/maps");
  redirect(`/maps/${map.id}`);
}

export async function updateMap(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const is_public = formData.get("is_public") === "true";

  if (!title || title.length < 1 || title.length > 100)
    return { error: "タイトルは1〜100文字で入力してください" };

  const { error } = await supabase
    .from("maps")
    .update({ title, description: description || null, is_public })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/maps/${id}`);
  revalidatePath("/maps");
  redirect(`/maps/${id}`);
}

export async function deleteMap(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("maps").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/maps");
  redirect("/maps");
}

export async function duplicateMap(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const [{ data: srcMap }, { data: srcPoints }, { data: srcDays }, { data: srcLines }] =
    await Promise.all([
      supabase.from("maps").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("points").select("*").eq("map_id", id).order("order_index"),
      supabase.from("map_days").select("*").eq("map_id", id).order("day_number"),
      supabase.from("map_lines").select("*").eq("map_id", id),
    ]);

  if (!srcMap) return { error: "マップが見つかりません" };

  const { data: newMap, error: mapErr } = await supabase
    .from("maps")
    .insert({ user_id: user.id, title: `コピー — ${srcMap.title}`, description: srcMap.description, is_public: false })
    .select()
    .single();

  if (mapErr || !newMap) return { error: "複製に失敗しました" };

  // Copy days and build id mapping
  const dayIdMap: Record<string, string> = {};
  if (srcDays && srcDays.length > 0) {
    for (const day of srcDays) {
      const { data: newDay } = await supabase
        .from("map_days")
        .insert({ map_id: newMap.id, day_number: day.day_number, date: day.date, title: day.title, color: day.color })
        .select()
        .single();
      if (newDay) dayIdMap[day.id] = newDay.id;
    }
  }

  // Copy points
  if (srcPoints && srcPoints.length > 0) {
    await supabase.from("points").insert(
      srcPoints.map(({ id: _id, map_id: _mid, created_at: _ca, ...rest }) => ({
        ...rest,
        map_id: newMap.id,
        day_id: rest.day_id ? (dayIdMap[rest.day_id] ?? null) : null,
      }))
    );
  }

  // Copy lines
  if (srcLines && srcLines.length > 0) {
    await supabase.from("map_lines").insert(
      srcLines.map(({ id: _id, map_id: _mid, created_at: _ca, ...rest }) => ({
        ...rest,
        map_id: newMap.id,
        day_id: rest.day_id ? (dayIdMap[rest.day_id] ?? null) : null,
      }))
    );
  }

  revalidatePath("/maps");
  return {};
}
