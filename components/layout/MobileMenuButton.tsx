"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

interface MobileMenuButtonProps {
  user: boolean;
}

export function MobileMenuButton({ user }: MobileMenuButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="p-2 text-gray-600 sm:hidden"
        onClick={() => setOpen(!open)}
        aria-label="メニュー"
      >
        <span className="text-xl">{open ? "✕" : "≡"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[57px] border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-gray-700">
            {user ? (
              <>
                <Link href="/maps" onClick={() => setOpen(false)}>
                  マイマップ
                </Link>
                <form action={signOut}>
                  <button type="submit" className="text-left text-gray-700">
                    ログアウト
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/maps/new" onClick={() => setOpen(false)}>
                  マップを作る
                </Link>
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  ログイン
                </Link>
                <Link href="/auth/register" onClick={() => setOpen(false)}>
                  新規登録
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
