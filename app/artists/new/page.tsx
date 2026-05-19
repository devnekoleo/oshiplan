import Link from "next/link";
import { ArtistForm } from "@/components/artists/ArtistForm";
import { createArtist } from "../actions";

export const metadata = { title: "推し登録" };

export default function NewArtistPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/artists" className="text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">推しを登録</h1>
      </div>
      <ArtistForm action={createArtist} />
    </main>
  );
}
