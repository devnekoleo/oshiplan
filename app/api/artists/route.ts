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

export async function GET() {
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

  const { data: artists, error } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ artists: artists ?? [] });
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const { name, category } = body;

  if (
    typeof name !== "string" ||
    name.length < 1 ||
    name.length > 50
  ) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "推しの名前は1〜50文字で入力してください",
        },
      },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "カテゴリが不正です",
        },
      },
      { status: 400 }
    );
  }

  const { data: artist, error } = await supabase
    .from("artists")
    .insert({ user_id: user.id, name, category })
    .select()
    .single();

  if (error || !artist) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "登録に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json(artist, { status: 201 });
}
