"use client";

import { formatCost } from "@/lib/utils";
import type { Plan } from "@/types";

interface PlanResultProps {
  plan: Plan;
}

export function PlanResult({ plan }: PlanResultProps) {
  const pj = plan.plan_json;
  if (!pj) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* サマリー */}
      <div className="rounded-xl bg-purple-50 px-4 py-3">
        <p className="font-semibold text-purple-800">{pj.summary}</p>
        <p className="text-sm text-purple-600">概算 {formatCost(pj.estimated_cost)}</p>
      </div>

      {/* 交通 */}
      {(pj.transit?.outbound || pj.transit?.return) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
            🚄 交通手段
          </h2>
          <div className="flex flex-col gap-2">
            {pj.transit.outbound && (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium">【往路】{pj.transit.outbound.name}</p>
                <p className="text-sm text-gray-500">
                  所要 {pj.transit.outbound.duration_min}分 ・ {formatCost(pj.transit.outbound.cost)}
                </p>
                {pj.transit.outbound.booking_url && (
                  <a href={pj.transit.outbound.booking_url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-purple-600 hover:underline">
                    予約サイトを開く →
                  </a>
                )}
              </div>
            )}
            {pj.transit.return && (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium">【復路】{pj.transit.return.name}</p>
                <p className="text-sm text-gray-500">
                  所要 {pj.transit.return.duration_min}分 ・ {formatCost(pj.transit.return.cost)}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 宿泊 */}
      {pj.accommodation && (
        <section>
          <h2 className="mb-3 font-semibold text-gray-800">🏨 宿泊</h2>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="font-medium">{pj.accommodation.name}</p>
            {pj.accommodation.area && <p className="text-sm text-gray-500">{pj.accommodation.area}</p>}
            {pj.accommodation.price_approx && (
              <p className="text-sm text-gray-500">約 {formatCost(pj.accommodation.price_approx)} / 泊</p>
            )}
            <div className="mt-2 flex gap-2">
              {pj.accommodation.affiliate_links?.rakuten && (
                <a href={pj.accommodation.affiliate_links.rakuten} target="_blank" rel="noopener noreferrer"
                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                  楽天トラベルで予約 →
                </a>
              )}
              {pj.accommodation.affiliate_links?.jalan && (
                <a href={pj.accommodation.affiliate_links.jalan} target="_blank" rel="noopener noreferrer"
                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100">
                  じゃらんで予約 →
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 行程 */}
      <section>
        <h2 className="mb-3 font-semibold text-gray-800">🗓️ 行程タイムライン</h2>
        <ol className="relative border-l border-purple-200 pl-4">
          {pj.itinerary.map((item, i) => (
            <li key={i} className="mb-4 last:mb-0">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-purple-300 bg-white" />
              <time className="text-xs font-semibold text-purple-600">{item.time}</time>
              <p className="text-sm text-gray-800">{item.action}</p>
              {item.cost && <p className="text-xs text-gray-400">{formatCost(item.cost)}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* 物販アドバイス */}
      {pj.merch_line_advice && (
        <section className="rounded-xl bg-yellow-50 px-4 py-3">
          <h2 className="mb-1 text-sm font-semibold text-yellow-800">🛍️ 物販アドバイス</h2>
          <p className="text-sm text-yellow-700">{pj.merch_line_advice}</p>
        </section>
      )}

      {/* Tips */}
      {pj.tips.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-800">💡 Tips</h2>
          <ul className="flex flex-col gap-1">
            {pj.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-purple-400">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
