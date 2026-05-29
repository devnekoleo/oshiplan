"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PointImage } from "@/types";

export async function createPoint(
  mapId: string,
  data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    images?: PointImage[];
    day_id?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    cost?: number;
    marker_color?: string | null;
    category?: string;
  }
): Promise<{ error?: string; id?: string; order_index?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  // 現在の最大 order_index を取得
  const { data: existing } = await supabase
    .from("points")
    .select("order_index")
    .eq("map_id", mapId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { data: point, error } = await supabase
    .from("points")
    .insert({
      map_id: mapId,
      title: data.title,
      description: data.description || null,
      lat: data.lat,
      lng: data.lng,
      order_index: nextOrder,
      images: data.images ?? [],
      day_id: data.day_id ?? null,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      cost: data.cost ?? 0,
      marker_color: data.marker_color ?? null,
      category: data.category ?? 'spot',
    })
    .select()
    .single();

  if (error || !point) return { error: error?.message ?? "ポイントの作成に失敗しました" };

  revalidatePath(`/maps/${mapId}`);
  return { id: point.id, order_index: nextOrder };
}

export async function updatePoint(
  mapId: string,
  pointId: string,
  data: {
    title: string;
    description: string;
    images: PointImage[];
    day_id?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    cost?: number;
    marker_color?: string | null;
    category?: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("points")
    .update({
      title: data.title,
      description: data.description || null,
      images: data.images,
      day_id: data.day_id !== undefined ? data.day_id : undefined,
      start_time: data.start_time !== undefined ? data.start_time : undefined,
      end_time: data.end_time !== undefined ? data.end_time : undefined,
      cost: data.cost !== undefined ? data.cost : undefined,
      marker_color: data.marker_color !== undefined ? data.marker_color : undefined,
      category: data.category !== undefined ? data.category : undefined,
    })
    .eq("id", pointId)
    .eq("map_id", mapId);

  if (error) return { error: error.message ?? "更新に失敗しました" };

  revalidatePath(`/maps/${mapId}`);
  return {};
}

export async function deletePoint(
  mapId: string,
  pointId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  await supabase.from("points").delete().eq("id", pointId).eq("map_id", mapId);

  revalidatePath(`/maps/${mapId}`);
  return {};
}

export async function reorderPoints(
  mapId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("points")
      .update({ order_index: index })
      .eq("id", id)
      .eq("map_id", mapId)
  );

  await Promise.all(updates);

  revalidatePath(`/maps/${mapId}`);
  return {};
}

// Day management
export async function addDay(
  mapId: string
): Promise<{ error?: string; id?: string; day_number?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  // Get current max day_number for this map
  const { data: existing } = await supabase
    .from("map_days")
    .select("day_number")
    .eq("map_id", mapId)
    .order("day_number", { ascending: false })
    .limit(1);

  const nextDayNumber = existing && existing.length > 0 ? existing[0].day_number + 1 : 1;

  const { data: day, error } = await supabase
    .from("map_days")
    .insert({
      map_id: mapId,
      day_number: nextDayNumber,
    })
    .select()
    .single();

  if (error || !day) return { error: "日程の追加に失敗しました" };

  revalidatePath(`/maps/${mapId}`);
  return { id: day.id, day_number: day.day_number };
}

export async function updateDay(
  dayId: string,
  data: { title?: string; date?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("map_days")
    .update({
      title: data.title !== undefined ? data.title || null : undefined,
      date: data.date !== undefined ? data.date || null : undefined,
    })
    .eq("id", dayId);

  if (error) return { error: "日程の更新に失敗しました" };

  return {};
}

export async function deleteDay(
  dayId: string,
  mapId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  // Delete the day — points with this day_id will have day_id set to NULL (SET NULL constraint)
  const { error } = await supabase
    .from("map_days")
    .delete()
    .eq("id", dayId);

  if (error) return { error: "日程の削除に失敗しました" };

  revalidatePath(`/maps/${mapId}`);
  return {};
}

// Checklist
export async function addChecklistItem(
  mapId: string,
  data: { category: string; label: string }
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  // Get current max order_index for this map+category
  const { data: existing } = await supabase
    .from("checklist_items")
    .select("order_index")
    .eq("map_id", mapId)
    .eq("category", data.category)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { data: item, error } = await supabase
    .from("checklist_items")
    .insert({
      map_id: mapId,
      category: data.category,
      label: data.label,
      order_index: nextOrder,
    })
    .select()
    .single();

  if (error || !item) return { error: "アイテムの追加に失敗しました" };

  revalidatePath(`/maps/${mapId}/checklist`);
  return { id: item.id };
}

export async function toggleChecklistItem(
  itemId: string,
  is_checked: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("checklist_items")
    .update({ is_checked })
    .eq("id", itemId);

  if (error) return { error: "更新に失敗しました" };

  return {};
}

export async function deleteChecklistItem(
  itemId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: "削除に失敗しました" };

  return {};
}

// Line drawing management
export async function createLine(
  mapId: string,
  data: { name?: string; color: string; width: number; coordinates: [number, number][]; day_id?: string | null }
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: line, error } = await supabase
    .from("map_lines")
    .insert({
      map_id: mapId,
      name: data.name || null,
      color: data.color,
      width: data.width,
      coordinates: data.coordinates,
      day_id: data.day_id ?? null,
    })
    .select()
    .single();

  if (error || !line) return { error: "ラインの作成に失敗しました" };

  revalidatePath(`/maps/${mapId}`);
  return { id: line.id };
}

export async function deleteLine(lineId: string, mapId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  await supabase.from("map_lines").delete().eq("id", lineId);
  revalidatePath(`/maps/${mapId}`);
  return {};
}
