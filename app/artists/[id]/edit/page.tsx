import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ArtistForm } from "@/components/artists/ArtistForm";
import { deleteArtist, updateArtist } from "../../actions";
import type { Artist } from "@/types";

export const metadata = { title: "推し編集" };

export default async function EditArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!artist) notFound();

  const a = artist as Artist;
  const updateWithId = updateArtist.bind(null, id);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/artists" className="text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">推しを編集</h1>
      </div>

      <ArtistForm
        action={updateWithId}
        defaultName={a.name}
        defaultCategory={a.category}
        submitLabel="保存する"
      />

      <div className="mt-8 border-t border-gray-100 pt-6">
        <form
          action={async () => {
            "use server";
            await deleteArtist(id);
          }}
        >
          <button
            type="submit"
            className="text-sm text-red-500 hover:text-red-700"
            onClick={(e) => {
              if (!confirm(`「${a.name}」を削除しますか？`)) e.preventDefault();
            }}
          >
            この推しを削除する
          </button>
        </form>
      </div>
    </main>
  );
}
