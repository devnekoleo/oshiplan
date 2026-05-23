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
