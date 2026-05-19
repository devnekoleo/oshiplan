"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArtistCategory } from "@/types";

const VALID_CATEGORIES: ArtistCategory[] = [
  "idol", "artist", "2.5d", "anime", "sports", "other",
];

export async function createArtist(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const name = formData.get("name") as string;
  const category = formData.get("category") as ArtistCategory;

  if (!name || name.length < 1 || name.length > 50)
    return { error: "名前は1〜50文字で入力してください" };
  if (!VALID_CATEGORIES.includes(category))
    return { error: "カテゴリを選択してください" };

  const { error } = await supabase
    .from("artists")
    .insert({ user_id: user.id, name, category });

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/artists");
  redirect("/artists");
}

export async function updateArtist(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const name = formData.get("name") as string;
  const category = formData.get("category") as ArtistCategory;

  if (!name || name.length < 1 || name.length > 50)
    return { error: "名前は1〜50文字で入力してください" };
  if (!VALID_CATEGORIES.includes(category))
    return { error: "カテゴリを選択してください" };

  const { error } = await supabase
    .from("artists")
    .update({ name, category })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/artists");
  redirect("/artists");
}

export async function deleteArtist(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("artists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/artists");
  redirect("/artists");
}
