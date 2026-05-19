import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
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

  const token = randomBytes(16).toString("hex");

  const { data: plan, error } = await supabase
    .from("plans")
    .update({ share_token: token })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("share_token")
    .single();

  if (error || !plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "プランが見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    share_token: plan.share_token,
    share_url: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${plan.share_token}`,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
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

  await supabase
    .from("plans")
    .update({ share_token: null })
    .eq("id", id)
    .eq("user_id", user.id);

  return new NextResponse(null, { status: 204 });
}
