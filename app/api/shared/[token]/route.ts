import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: plan, error } = await supabase
    .from("plans")
    .select("event_name, venue_name, event_date, event_time, departure, plan_json, created_at")
    .eq("share_token", token)
    .single();

  if (error || !plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "プランが見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ...plan, shared_at: plan.created_at });
}
