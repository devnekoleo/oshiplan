export const SYSTEM_PROMPT = `あなたは推し活遠征に精通した日本の旅行プランナーです。
推し活（アイドル・アーティスト・2.5次元・アニメ等）のコンサート・イベント遠征に特化した
最適なプランをJSON形式で作成します。

【ルール】
- 違法行為（不法侵入・転売・個人宅の特定・出待ち場所の特定等）を助長する内容は含めないこと
- 宿泊・交通の価格は概算であり、確定情報として断言しないこと
- accommodation.affiliate_links は必ず null を設定すること（サーバー側で別途付与する）
- transit の booking_url は公式サイトのURLを設定すること（えきねっと等）
- 回答はJSONのみ出力すること（コードブロック・説明文は不要）
- 必ず指定のJSONスキーマに厳密に従うこと`;

interface UserPromptParams {
  eventName: string;
  venueName: string;
  venueAddress?: string;
  eventDate: string;
  eventTime?: string;
  departure: string;
  budgetHint?: number;
  options: {
    stayOvernight: boolean;
    merch: boolean;
    pilgrimage: boolean;
  };
  mapsContext?: string;
}

export function buildUserPrompt(params: UserPromptParams): string {
  const {
    eventName,
    venueName,
    venueAddress,
    eventDate,
    eventTime,
    departure,
    budgetHint,
    options,
    mapsContext,
  } = params;

  const lines: string[] = [
    "以下の公演情報をもとに遠征プランを作成してください。",
    "",
    "【公演情報】",
    `- 公演名: ${eventName}`,
    `- 会場: ${venueName}${venueAddress ? `（${venueAddress}）` : ""}`,
    `- 公演日: ${eventDate}${eventTime ? ` ${eventTime}` : ""}`,
    `- 出発地: ${departure}`,
  ];

  if (budgetHint) lines.push(`- 予算目安: ${budgetHint.toLocaleString("ja-JP")}円`);

  lines.push(
    "",
    "【オプション】",
    `- 宿泊: ${options.stayOvernight ? "あり（1泊を想定）" : "なし（日帰り）"}`,
    `- 物販: ${options.merch ? "参加する" : "参加しない"}`,
    `- 聖地巡礼: ${options.pilgrimage ? "含める" : "含めない"}`
  );

  if (mapsContext) {
    lines.push("", "【会場周辺情報】", mapsContext);
  }

  lines.push(
    "",
    "【出力形式】",
    "以下のJSONスキーマに厳密に従ってプランを出力してください:",
    "",
    JSON.stringify(PLAN_JSON_SCHEMA_DESCRIPTION, null, 2)
  );

  return lines.join("\n");
}

export const PLAN_JSON_SCHEMA_DESCRIPTION = {
  summary: "string（プランの一行サマリー、最大200文字）",
  estimated_cost: "number（概算総費用・円）",
  itinerary: [
    {
      time: "string（HH:MM形式）",
      action: "string（行動内容、最大200文字）",
      cost: "number | null（費用・円。不明はnull）",
    },
  ],
  accommodation: {
    name: "string（ホテル名またはエリア名）",
    area: "string | null（エリア名）",
    price_approx: "number | null（概算宿泊費・円）",
    affiliate_links: null,
  },
  transit: {
    outbound: {
      type: "shinkansen | airplane | bus | local | other",
      name: "string（交通手段名）",
      cost: "number（費用・円）",
      duration_min: "number（所要時間・分）",
      booking_url: "string | null（予約URL）",
    },
    return: "（往路と同じ構造）",
  },
  merch_line_advice: "string | null（物販の並び時間アドバイス）",
  goods_links: [],
  tips: ["string（Tips・注意事項、最大10件）"],
};
