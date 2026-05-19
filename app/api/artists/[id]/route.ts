import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ArtistCategory } from "@/types";

const VALID_CATEGORIES: ArtistCategory[] = [
  "idol",
  "artist",
  "2.5d",
  "anime",
  "sports",
  "other",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const updates: { name?: string; category?: ArtistCategory } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 50) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "名前は1〜50文字で入力してください" } },
        { status: 400 }
      );
    }
    updates.name = body.name;
  }

  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "カテゴリが不正です" } },
        { status: 400 }
      );
    }
    updates.category = body.category;
  }

  const { data: artist, error } = await supabase
    .from("artists")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !artist) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "推しが見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json(artist);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const { error } = await supabase
    .from("artists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "推しが見つかりません" } },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
