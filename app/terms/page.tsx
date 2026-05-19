export const metadata = {
  title: "利用規約 | OshiPlan",
  description: "OshiPlan の利用規約",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">利用規約</h1>
      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第1条（サービスの目的）</h2>
          <p>OshiPlan（以下「本サービス」）は、推し活遠征プランの自動生成を支援するWebサービスです。本サービスを利用することで、以下の利用規約（以下「本規約」）に同意したものとみなします。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第2条（利用条件）</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>本サービスは個人利用を目的としています</li>
            <li>13歳以上の方が対象です</li>
            <li>本規約に同意した上でご利用ください</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第3条（禁止事項）</h2>
          <p>以下の行為を禁止します：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>法令に違反する行為</li>
            <li>他のユーザーまたは第三者の権利を侵害する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセス・スクレイピング等の行為</li>
            <li>商業目的での無断利用</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第4条（AIが生成するコンテンツについて）</h2>
          <p>本サービスのAIが生成する遠征プランは参考情報です。交通・宿泊の料金や時刻は変動する場合があります。予約は各サービスの公式情報を必ずご確認ください。当サービスは生成情報の正確性を保証しません。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第5条（アフィリエイトリンクについて）</h2>
          <p>本サービスは楽天アフィリエイト・Amazonアソシエイト等のアフィリエイトプログラムに参加しています。プラン内のリンクからご予約いただいた場合、当サービスが報酬を受け取る場合があります。これはユーザーの費用を増加させるものではありません。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第6条（免責事項）</h2>
          <p>当サービスは、本サービスの利用により生じた損害について、一切の責任を負いません。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第7条（規約の変更）</h2>
          <p>本規約は予告なく変更される場合があります。変更後も本サービスを利用し続けた場合、変更後の規約に同意したものとみなします。</p>
        </section>

        <p className="pt-4 text-xs text-gray-400">制定日: 2026年5月</p>
      </div>
    </main>
  );
}
