import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { MobileMenuButton } from "./MobileMenuButton";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-blue-600"
        >
          <span className="text-xl">📍</span>
          <span className="text-lg">viamaps</span>
        </Link>

        {/* PC nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 sm:flex">
          {user ? (
            <Link href="/maps" className="hover:text-blue-600">
              マイマップ
            </Link>
          ) : (
            <Link href="/maps/new" className="hover:text-blue-600">
              マップを作る
            </Link>
          )}
        </nav>

        {/* Auth nav */}
        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <SignOutButton />
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                ログイン
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                登録
              </Link>
            </>
          )}
        </div>

        <MobileMenuButton user={!!user} />
      </div>
    </header>
  );
}
