export const metadata = { title: "利用規約 | OshiPlan" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 prose">
      <h1>利用規約</h1>
      <p>OshiPlan（以下「本サービス」）をご利用いただくにあたり、以下の利用規約に同意いただく必要があります。</p>
      <h2>第1条（サービスの目的）</h2>
      <p>本サービスは、推し活遠征プランの自動生成を支援するWebサービスです。</p>
      <h2>第2条（禁止事項）</h2>
      <p>違法行為、他ユーザーへの迷惑行為、サービスへの不正アクセス等を禁止します。</p>
      <h2>第3条（免責事項）</h2>
      <p>AIが生成する情報は参考情報です。交通・宿泊の予約は各サービスの公式情報をご確認ください。</p>
      <p className="text-sm text-gray-400">制定日: 2026年5月</p>
    </main>
  );
}
