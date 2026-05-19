import { createClient } from "@/lib/supabase/server";
import type { PlanJson } from "@/types";

interface CachedTransit {
  transit: PlanJson["transit"];
  accommodation_hint: string | null;
}

/**
 * 同一会場×出発地の過去7日以内のプランからtransit情報をキャッシュとして取得する
 * Claude APIのトークン数削減のためにプロンプトに注入する
 */
export async function getCachedTransitHint(
  venueName: string,
  departure: string
): Promise<string> {
  try {
    const supabase = await createClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: plans } = await supabase
      .from("plans")
      .select("plan_json")
      .ilike("venue_name", `%${venueName}%`)
      .ilike("departure", `%${departure}%`)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (!plans || plans.length === 0) return "";

    const pj = plans[0].plan_json as PlanJson;
    if (!pj?.transit) return "";

    const hints: string[] = ["【過去の類似プランからの交通情報（参考）】"];

    if (pj.transit.outbound) {
      hints.push(
        `往路: ${pj.transit.outbound.name}（所要${pj.transit.outbound.duration_min}分、約¥${pj.transit.outbound.cost.toLocaleString()}）`
      );
    }
    if (pj.transit.return) {
      hints.push(
        `復路: ${pj.transit.return.name}（所要${pj.transit.return.duration_min}分、約¥${pj.transit.return.cost.toLocaleString()}）`
      );
    }
    if (pj.accommodation?.area) {
      hints.push(`宿泊エリア参考: ${pj.accommodation.area}`);
    }

    return hints.join("\n");
  } catch {
    return "";
  }
}
