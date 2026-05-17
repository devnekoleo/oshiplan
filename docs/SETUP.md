# OshiPlan セットアップガイド

開発を始める前に以下の外部サービスを準備してください。

---

## 前提条件

- Node.js 22 以上
- npm 10 以上
- Git
- [Supabase CLI](https://supabase.com/docs/guides/cli)（ローカル開発用）

---

## 1. リポジトリのセットアップ

```bash
git clone https://github.com/devnekoleo/oshiplan.git
cd oshiplan
npm install
cp .env.local.example .env.local
```

---

## 2. Supabase

### クラウドプロジェクト作成
1. [supabase.com](https://supabase.com) でアカウント作成
2. 「New Project」でプロジェクト作成（リージョン: Northeast Asia / Tokyo）
3. **Dashboard > Settings > API** で以下を取得:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
4. **SQL Editor** でマイグレーションを実行:
   ```bash
   # ローカルから適用
   cat supabase/migrations/20260517000001_initial_schema.sql | supabase db push
   cat supabase/migrations/20260517000002_rls_policies.sql | supabase db push
   cat supabase/seed.sql | supabase db push
   ```

### ローカル開発
```bash
supabase start          # Docker が起動します
supabase db push        # マイグレーション適用
supabase db seed        # シードデータ投入
```

### Apple/Google ソーシャルログイン
- **Authentication > Providers** で Apple, Google を有効化
- 各プロバイダーの設定手順は [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth) を参照

---

## 3. Anthropic Claude API

1. [console.anthropic.com](https://console.anthropic.com) でアカウント作成
2. **API Keys** でキーを発行
3. 月次利用上限を設定（過課金防止のため推奨: $30〜50/月）
4. `ANTHROPIC_API_KEY` に設定

---

## 4. Google Maps Platform

1. [Google Cloud Console](https://console.cloud.google.com) でプロジェクト作成
2. 以下の API を有効化:
   - **Places API**（会場検索）
   - **Directions API**（経路検索）
   - **Geocoding API**（住所変換）
3. **認証情報 > APIキーを作成**
4. APIキーの制限: 「HTTPリファラー」でドメインを制限
5. `GOOGLE_MAPS_API_KEY` に設定

> 月 $200 の無料クレジットあり。超過分は従量課金。

---

## 5. 楽天トラベル API（アフィリエイト）

1. [楽天ウェブサービス](https://webservice.rakuten.co.jp) でアプリ登録
2. **アプリ ID** を取得 → `RAKUTEN_APP_ID`
3. [楽天アフィリエイト](https://affiliate.rakuten.co.jp) でアフィリエイトID取得 → `RAKUTEN_AFFILIATE_ID`

> 審査: コンテンツが充実してから申請推奨（否認されても再申請可）

---

## 6. Amazon アソシエイト

1. [Amazonアソシエイト](https://affiliate.amazon.co.jp) でアカウント開設
2. **トラッキング ID** を取得（例: `oshiplan-22`）→ `AMAZON_ASSOCIATE_TAG`

> 審査: サイト公開後、3ヶ月以内に3件の売上が必要

---

## 7. Vercel

### デプロイ設定
1. [vercel.com](https://vercel.com) でアカウント作成
2. GitHub リポジトリをインポート
3. **Environment Variables** で `.env.local.example` の全変数を設定

### Vercel KV（レート制限用）
1. **Dashboard > Storage > Create Database > KV**
2. プロジェクトに接続
3. `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動設定される

### Cron シークレット
1. 任意の文字列を生成: `openssl rand -hex 32`
2. Vercel 環境変数に `CRON_SECRET` として追加

---

## 8. Sentry（エラー監視）

1. [sentry.io](https://sentry.io) でアカウント作成
2. **Next.js プロジェクト**を作成
3. DSN を取得 → `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
4. クリティカルアラート（メール通知）を設定:
   - `503` 応答が続く場合
   - ログイン関連エラーが発生した場合

---

## 9. ローカル開発の起動

```bash
# Supabase ローカル起動
supabase start

# Next.js 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

---

## 10. アフィリエイトプログラム申請のタイミング

| プログラム | 申請推奨タイミング |
|-----------|------------------|
| 楽天トラベル | βリリース後（コンテンツ確認のため） |
| Amazonアソシエイト | 正式公開後すぐ |
| じゃらん（A8.net経由） | 正式公開後 |

> **重要**: 各プログラムの規約を必ず確認し、遵守してください。アフィリエイトリンクであることを適切に開示してください。
