import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = { title: "設定" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/settings");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">アカウント</h2>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
          <div className="px-4 py-3">
            <p className="text-sm text-gray-500">メールアドレス</p>
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">サポート</h2>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
          {[
            { label: "利用規約", href: "/terms" },
            { label: "プライバシーポリシー", href: "/privacy" },
          ].map(({ label, href }) => (
            <Link key={href} href={href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <span className="text-sm text-gray-800">{label}</span>
              <span className="text-gray-300">›</span>
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-400">バージョン</span>
            <span className="text-sm text-gray-400">1.0.0</span>
          </div>
        </div>
      </section>

      <SignOutButton />
    </main>
  );
}
