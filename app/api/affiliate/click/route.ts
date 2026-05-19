import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES = ["hotel", "transit", "goods"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { plan_id, affiliate_type, affiliate_partner, destination_url } = body;

  if (!VALID_TYPES.includes(affiliate_type)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "affiliate_typeが不正です" } },
      { status: 400 }
    );
  }

  if (!destination_url || typeof destination_url !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "destination_urlが必要です" } },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  await supabase.from("affiliate_clicks").insert({
    plan_id: plan_id ?? null,
    affiliate_type,
    affiliate_partner: affiliate_partner ?? "unknown",
  });

  return NextResponse.json({ redirect_url: destination_url });
}
