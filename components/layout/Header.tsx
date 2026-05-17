"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-purple-600">
          <span className="text-xl">🎵</span>
          <span className="text-lg">OshiPlan</span>
        </Link>

        {/* PC nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 sm:flex">
          <Link href="/plans/new" className="hover:text-purple-600">
            プランを作る
          </Link>
          <Link href="/venues" className="hover:text-purple-600">
            会場一覧
          </Link>
          <Link href="/plans" className="hover:text-purple-600">
            マイプラン
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          <span className="text-xl">{menuOpen ? "✕" : "≡"}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-gray-700">
            <Link href="/plans/new" onClick={() => setMenuOpen(false)}>
              プランを作る
            </Link>
            <Link href="/venues" onClick={() => setMenuOpen(false)}>
              会場一覧
            </Link>
            <Link href="/plans" onClick={() => setMenuOpen(false)}>
              マイプラン
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
