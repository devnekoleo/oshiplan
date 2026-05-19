import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteArtist } from "./actions";
import type { Artist } from "@/types";

export const metadata = { title: "推し一覧" };

export default async function ArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/artists");

  const supabase = await createClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">推し一覧</h1>
        <Link href="/artists/new">
          <Button size="sm">＋ 推し登録</Button>
        </Link>
      </div>

      {!artists || artists.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="まず推しを登録しましょう"
          description="遠征プランを作成するには推しの登録が必要です"
          actionLabel="推しを登録する"
          actionHref="/artists/new"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {(artists as Artist[]).map((artist) => (
            <li
              key={artist.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <CategoryBadge category={artist.category} />
                <span className="font-medium text-gray-900">{artist.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/artists/${artist.id}/edit`}>
                  <Button variant="secondary" size="sm">編集</Button>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteArtist(artist.id);
                  }}
                >
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      if (!confirm(`「${artist.name}」を削除しますか？\n紐づくプランは削除されません。`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    削除
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
