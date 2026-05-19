import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "ユーザーが見つかりません" } },
      { status: 404 }
    );
  }

  const dailyLimit = 10;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    home_station: user.home_station,
    daily_ai_used: user.daily_ai_used ?? 0,
    daily_ai_limit: dailyLimit,
    created_at: user.created_at,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const updates: { display_name?: string; home_station?: string } = {};

  if (body.display_name !== undefined) {
    if (
      typeof body.display_name !== "string" ||
      body.display_name.length < 1 ||
      body.display_name.length > 30
    ) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "表示名は1〜30文字で入力してください",
          },
        },
        { status: 400 }
      );
    }
    updates.display_name = body.display_name;
  }

  if (body.home_station !== undefined) {
    if (typeof body.home_station !== "string" || body.home_station.length > 50) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "最寄り駅は50文字以内で入力してください",
          },
        },
        { status: 400 }
      );
    }
    updates.home_station = body.home_station;
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", authUser.id)
    .select()
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "更新に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    home_station: user.home_station,
    daily_ai_used: user.daily_ai_used ?? 0,
    daily_ai_limit: 10,
    created_at: user.created_at,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  // Supabase のサービスロールで auth.users を削除（cascade で public.users も削除）
  const adminClient = await import("@supabase/supabase-js").then(({ createClient: sc }) =>
    sc(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  );

  const { error } = await adminClient.auth.admin.deleteUser(authUser.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "削除に失敗しました" } },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
