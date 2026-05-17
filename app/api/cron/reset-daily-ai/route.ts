import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Vercel Cron Job: 毎日 JST 0:00（UTC 15:00）に daily_ai_used をリセット
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("users")
    .update({ daily_ai_used: 0, daily_ai_reset_at: today })
    .lt("daily_ai_reset_at", today);

  if (error) {
    console.error("[cron] reset-daily-ai failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reset_at: today });
}
