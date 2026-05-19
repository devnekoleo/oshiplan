import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { PlanJsonSchema } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { getMapsContext } from "@/lib/maps";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GUEST_DAILY_LIMIT = 3;
const USER_DAILY_LIMIT = 10;

async function checkRateLimit(
  userId: string | null,
  ip: string
): Promise<boolean> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  if (!userId) {
    // ゲスト: IPベースのレート制限（簡易版 - Vercel KV未設定時はIP確認のみ）
    return true; // Vercel KV設定後に実装
  }

  const { data: user } = await supabase
    .from("users")
    .select("daily_ai_used, daily_ai_reset_at")
    .eq("id", userId)
    .single();

  if (!user) return false;

  const needsReset = !user.daily_ai_reset_at || user.daily_ai_reset_at < today;
  if (needsReset) {
    await supabase
      .from("users")
      .update({ daily_ai_used: 0, daily_ai_reset_at: today })
      .eq("id", userId);
    return true;
  }

  return (user.daily_ai_used ?? 0) < USER_DAILY_LIMIT;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // レート制限チェック
  const canGenerate = await checkRateLimit(user?.id ?? null, ip);
  if (!canGenerate) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: user
            ? `本日の生成上限（${USER_DAILY_LIMIT}回）に達しました。明日また使えます`
            : `本日の生成上限（${GUEST_DAILY_LIMIT}回）に達しました。ログインすると${USER_DAILY_LIMIT}回まで使えます`,
        },
      },
      { status: 429 }
    );
  }

  // リクエストバリデーション
  let body: {
    artist_id?: string;
    event_name: string;
    venue_hint: string;
    event_date: string;
    event_time?: string;
    departure?: string;
    budget_hint?: number;
    options?: {
      stay_overnight?: boolean;
      merch?: boolean;
      pilgrimage?: boolean;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "リクエストが不正です" } },
      { status: 400 }
    );
  }

  const { event_name, venue_hint, event_date, event_time, budget_hint, options } = body;

  if (!event_name || event_name.length < 1 || event_name.length > 80) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "公演名は1〜80文字で入力してください" } },
      { status: 400 }
    );
  }

  if (!venue_hint || venue_hint.length < 1 || venue_hint.length > 80) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "会場名は1〜80文字で入力してください" } },
      { status: 400 }
    );
  }

  if (!event_date || new Date(event_date) < new Date(new Date().toDateString())) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "公演日は今日以降の日付を入力してください" } },
      { status: 400 }
    );
  }

  // 出発地の決定
  let departure = body.departure;
  if (!departure && user) {
    const { data: userData } = await supabase
      .from("users")
      .select("home_station")
      .eq("id", user.id)
      .single();
    departure = userData?.home_station ?? "東京駅";
  }
  departure = departure ?? "東京駅";

  // Google Maps で会場情報取得
  const mapsContext = await getMapsContext(venue_hint, departure);

  // Claude API でプラン生成（最大2回リトライ）
  let planJson = null;
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const userPrompt = buildUserPrompt({
        eventName: event_name,
        venueName: venue_hint,
        eventDate: event_date,
        eventTime: event_time,
        departure,
        budgetHint: budget_hint,
        options: {
          stayOvernight: options?.stay_overnight ?? false,
          merch: options?.merch ?? false,
          pilgrimage: options?.pilgrimage ?? false,
        },
        mapsContext: mapsContext || undefined,
      });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        lastError = "JSONの抽出に失敗しました";
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = PlanJsonSchema.safeParse(parsed);

      if (!validated.success) {
        lastError = "スキーマバリデーション失敗: " + validated.error.message;
        continue;
      }

      planJson = validated.data;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "不明なエラー";
    }
  }

  if (!planJson) {
    return NextResponse.json(
      { error: { code: "AI_UNAVAILABLE", message: "プランの生成に失敗しました。もう一度お試しください" } },
      { status: 503 }
    );
  }

  // DBに保存
  const insertData = {
    user_id: user?.id ?? null,
    artist_id: body.artist_id ?? null,
    event_name,
    venue_name: venue_hint,
    event_date,
    event_time: event_time ?? null,
    departure,
    budget_hint: budget_hint ?? null,
    plan_json: planJson,
  };

  const { data: plan, error: insertError } = await supabase
    .from("plans")
    .insert(insertData)
    .select()
    .single();

  if (insertError || !plan) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "プランの保存に失敗しました" } },
      { status: 500 }
    );
  }

  // daily_ai_used をインクリメント
  if (user) {
    await supabase.rpc("increment_daily_ai_used", { user_id_arg: user.id });
  }

  return NextResponse.json(plan, { status: 201 });
}
