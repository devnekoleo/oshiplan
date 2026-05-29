import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl mb-4">🗺️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ページが見つかりません</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <Link
        href="/maps"
        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        マイマップへ戻る
      </Link>
    </main>
  );
}
