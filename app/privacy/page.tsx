export const metadata = {
  title: "プライバシーポリシー | OshiPlan",
  description: "OshiPlan のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">1. 収集する情報</h2>
          <p>本サービスでは、以下の情報を収集します：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>アカウント情報</strong>: メールアドレス、表示名（任意）</li>
            <li><strong>サービス利用情報</strong>: 最寄り駅（任意）、生成した遠征プラン</li>
            <li><strong>利用ログ</strong>: アクセスログ、AI生成回数（レート制限用）</li>
            <li><strong>アフィリエイトクリック</strong>: クリックした広告の種別（個人を特定しない形式）</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">2. 情報の利用目的</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>遠征プランの自動生成サービスの提供</li>
            <li>サービスの品質改善・不正利用防止</li>
            <li>アフィリエイトリンクの表示と収益計測</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">3. 情報の第三者提供</h2>
          <p>以下の場合を除き、個人情報を第三者に提供しません：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>法令に基づく場合</li>
            <li>ユーザーの同意がある場合</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">4. 利用する外部サービス</h2>
          <p>本サービスは以下の外部サービスを利用しています：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase</strong>: データベース・認証（<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">プライバシーポリシー</a>）</li>
            <li><strong>Anthropic Claude API</strong>: AI遠征プラン生成</li>
            <li><strong>Google Maps Platform</strong>: 会場情報取得</li>
            <li><strong>楽天アフィリエイト / Amazonアソシエイト</strong>: アフィリエイト収益化</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">5. アフィリエイトプログラムについて</h2>
          <p>本サービスは<strong>楽天アフィリエイト</strong>および<strong>Amazonアソシエイト・プログラム</strong>に参加しており、適格販売により収入を得ています。アフィリエイトリンクはユーザーのご負担を増やすものではありません。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">6. Cookieの利用</h2>
          <p>ログイン状態の維持のためにCookieを使用しています。ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">7. 情報の削除</h2>
          <p>アカウント削除機能を利用することで、保存された全データを削除できます。設定画面の「アカウントを削除する」から実行してください。</p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">8. お問い合わせ</h2>
          <p>プライバシーに関するお問い合わせは、サービス内のお問い合わせフォームからご連絡ください。</p>
        </section>

        <p className="pt-4 text-xs text-gray-400">制定日: 2026年5月</p>
      </div>
    </main>
  );
}
