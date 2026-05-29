import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapCardActions } from "./MapCardActions";
import type { TravelMap } from "@/types";

export const metadata = { title: "マイマップ" };

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function MapsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/maps");

  const supabase = await createClient();
  const { data: maps } = await supabase
    .from("maps")
    .select("*, points(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const mapList = (maps ?? []) as (TravelMap & { points: unknown[] })[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マイマップ</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mapList.length > 0 ? `${mapList.length} 件のマップ` : "まだマップがありません"}
          </p>
        </div>
        <Link href="/maps/new">
          <Button size="sm" className="gap-1">
            <span className="text-base leading-none">＋</span>
            新しいマップを作成
          </Button>
        </Link>
      </div>

      {mapList.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="マップがありません"
          description="最初のマップを作って旅を記録しましょう"
          actionLabel="マップを作る"
          actionHref="/maps/new"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {mapList.map((map) => {
            const pointCount = (map.points as unknown as [{ count: number }])[0]?.count ?? 0;
            return (
              <div
                key={map.id}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Card top: map thumbnail placeholder */}
                <div className="relative h-36 rounded-t-2xl bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
                  {/* Decorative pin icons */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="#2563eb">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>

                  {/* Point count badge */}
                  <div className="absolute bottom-2 left-3 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-gray-600 backdrop-blur-sm">
                    📍 {pointCount} ポイント
                  </div>

                  {/* Public badge */}
                  <div className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {map.is_public ? "公開" : "非公開"}
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="truncate text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {map.title}
                  </h2>

                  {map.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {map.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm italic text-gray-300">説明なし</p>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    更新日: {formatDate(map.updated_at)}
                  </p>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Link href={`/maps/${map.id}`} className="flex-1">
                      <button className="w-full rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                        編集
                      </button>
                    </Link>
                    {pointCount > 0 && (
                      <Link href={`/maps/${map.id}/view`} className="flex-1">
                        <button className="w-full rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                          ▶ 見る
                        </button>
                      </Link>
                    )}
                    <MapCardActions mapId={map.id} title={map.title} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
