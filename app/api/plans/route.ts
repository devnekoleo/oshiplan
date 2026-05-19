import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "upcoming";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("plans")
    .select("id, artist_id, event_name, venue_name, event_date, event_time, departure, share_token, is_archived, created_at, plan_json->summary, plan_json->estimated_cost", { count: "exact" })
    .eq("user_id", user.id)
    .order("event_date", { ascending: type === "upcoming" })
    .range(offset, offset + limit - 1);

  if (type === "upcoming") {
    query = query.gte("event_date", today);
  } else {
    query = query.lt("event_date", today);
  }

  const { data: plans, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    plans: plans ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
