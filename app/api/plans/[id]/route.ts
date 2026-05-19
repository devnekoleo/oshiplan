import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PlanJsonSchema } from "@/lib/ai/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
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

  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "プランが見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json(plan);
}

export async function PATCH(request: Request, { params }: Params) {
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

  const body = await request.json();

  if (body.plan_json !== undefined) {
    const validated = PlanJsonSchema.safeParse(body.plan_json);
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "プランの内容が不正です" } },
        { status: 400 }
      );
    }
    body.plan_json = validated.data;
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .update(body)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !plan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "プランが見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json(plan);
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

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "プランが見つかりません" } },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
