"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const display_name = (formData.get("display_name") as string)?.trim();
  if (display_name && display_name.length > 50)
    return { error: "名前は50文字以内で入力してください" };

  const { error } = await supabase.auth.updateUser({
    data: { display_name: display_name || null },
  });

  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/settings");
  return { success: true };
}
