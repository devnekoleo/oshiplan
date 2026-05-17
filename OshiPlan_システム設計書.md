# OshiPlan システム設計書

推し活遠征プランナーWebサービス

2026年5月 / Version 2.0

---

## 1. システム概要

OshiPlanは、ユーザーが入力した推し活の公演情報をもとに、AIが遠征計画を自動生成し、宿泊・交通・グッズの予約アフィリエイトリンクとともに提供するWebブラウザサービス。

### 1.1 設計方針

- 個人開発として最小コスト・最小運用負荷で立ち上げる
- **SEOファースト**: 静的ページ（会場別LP等）と動的生成を組み合わせる
- **アフィリエイトCV最大化**: プラン生成直後に予約リンクを自然に配置
- サーバーレス・マネージドサービス中心の構成
- AI APIコールはサーバー側で実施し、APIキーをクライアントに露出させない
- LLMコスト管理を最優先（IPベースのレート制限・キャッシュ・利用枠制御）

### 1.2 主要な非機能要件

| 項目 | 要件 |
|------|------|
| 可用性 | 月次稼働率99%以上（個人開発レベル） |
| 性能 | AIプラン生成は10秒以内に完了、ページ表示1秒以内（LCP） |
| SEO | Core Web Vitals グリーン、会場別ページが検索上位を狙える構造 |
| セキュリティ | 通信HTTPS、認証はOAuth/PKCE、APIキーはサーバー側のみ保持 |
| プライバシー | 個人情報保護法準拠、最小限の取得、明確な利用規約 |
| スケーラビリティ | 月間50,000 PVまで構成変更なしで対応 |
| コスト | 月次インフラ＋API合計をアフィリエイト収益の30%以下に維持 |

---

## 2. システムアーキテクチャ

### 2.1 全体構成

ブラウザ → Next.js（SSR/SSG） → バックエンドサービス（Supabase / Claude API / 外部API）の構成。

```
┌──────────────────────────────────────────────────────────┐
│         Browser (PC / Smartphone)                        │
│         Next.js App Router (React)                       │
│         Tailwind CSS / TanStack Query                    │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────┐
│         Next.js API Routes (Vercel Edge Functions)       │
│         認証検証 / レート制限 / キャッシュ                │
│         LLMプロンプト構築・実行                           │
│         アフィリエイトURL生成                             │
└───────┬─────────────┬────────────────┬───────────────────┘
        ▼             ▼                ▼
┌────────────┐ ┌──────────┐ ┌──────────────────┐
│  Supabase  │ │  Claude  │ │  Google Maps API │
│  DB + Auth │ │   API    │ │  楽天トラベルAPI  │
└────────────┘ └──────────┘ └──────────────────┘
```

### 2.2 技術スタック選定

| レイヤー | 採用技術 | 選定理由 |
|---------|---------|---------|
| フレームワーク | **Next.js 15 (App Router)** | SSG/SSR/ISRを使い分けられる。SEO・パフォーマンスに最適 |
| スタイリング | **Tailwind CSS** | デザイン速度、AI駆動開発との相性 |
| サーバー状態管理 | **TanStack Query** | APIキャッシュ・ローディング状態管理 |
| クライアント状態 | **Zustand** | ローカル状態（UIフラグ・プラン作成ウィザード等） |
| API Layer | **Next.js API Routes** (Vercel Edge Runtime) | 低レイテンシ、同一リポジトリで完結 |
| DB / 認証 | **Supabase** | Postgres + Auth + ストレージを一体提供、無料枠大 |
| LLM | **Anthropic Claude API** (claude-sonnet-4-6) | 日本語精度・推論品質 |
| 地図 | **Google Maps Platform** | 経路・場所検索の業界標準 |
| アフィリエイト | **楽天トラベルAPI / A8.net / Amazon アソシエイト** | 収益の柱 |
| 監視 | **Sentry + Vercel Analytics** | エラー追跡・SEOトラフィック分析 |
| CI/CD | **GitHub Actions + Vercel** | git push → 自動デプロイ |

---

## 3. レンダリング戦略（SEO対応）

### 3.1 ページ種別とレンダリング方式

| ページ | 方式 | 理由 |
|--------|------|------|
| 会場別ランディングページ（/venue/[slug]） | **SSG** | SEOで最重要。ビルド時に静的生成 |
| トップページ（/） | **SSG** | 変更頻度低。静的で十分 |
| プラン一覧（/plans） | **SSR** | ユーザー固有データ |
| プラン詳細（/plans/[id]） | **SSR** | ユーザー固有データ |
| 共有プラン（/shared/[token]） | **SSR** | 認証不要・キャッシュ可 |
| プラン作成（/plans/new） | **CSR** | インタラクティブなウィザード |

### 3.2 会場別ページの構造

```
/venue/[slug]
├── OGP・title・descriptionにキーワードを含める
├── 会場の基本情報（アクセス・収容人数・コインロッカー）
├── 周辺ホテル一覧（楽天トラベルアフィリエイトリンク付き）
├── 「この会場への遠征プランを作成する」CTA
└── 関連会場リンク
```

---

## 4. データモデル

### 4.1 ER概要

中心は `users`, `plans`, `artists`。サブスクリプション不要のため、課金系テーブルを削除し、アフィリエイトクリックのトラッキング用テーブルを追加する。

### 4.2 主要テーブル

#### users

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | Supabase Auth連動の主キー |
| email | text | 認証メール |
| display_name | text | 表示名 |
| home_station | text | 最寄り駅（プラン生成の起点） |
| daily_ai_used | int | 当日のAI生成利用回数（レート制限用） |
| daily_ai_reset_at | date | daily_ai_usedのリセット日 |
| created_at | timestamptz | 作成日時 |

#### artists（推し）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| user_id | uuid | 登録ユーザー（FK to users） |
| name | text | 推しの名称 |
| category | enum | `idol / artist / 2.5d / anime / sports / other` |
| created_at | timestamptz | 作成日時 |

#### plans（遠征プラン）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| user_id | uuid | 作成者（nullable: 未ログインはnull） |
| artist_id | uuid | 対象推し（nullable） |
| event_name | text | 公演名 |
| venue_name | text | 会場名 |
| venue_slug | text | 会場別ページとの紐づけ（例: tokyo-dome） |
| event_date | date | 公演日 |
| event_time | time | 開演時刻 |
| departure | text | 出発地 |
| plan_json | jsonb | AI生成プラン本体（アフィリエイトURL含む） |
| share_token | text | 共有用ランダムトークン（UNIQUE, nullable） |
| is_archived | bool | アーカイブ済みフラグ |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

#### venues（会場マスタ）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| slug | text | URLスラッグ（例: tokyo-dome）UNIQUE |
| name | text | 会場名（例: 東京ドーム） |
| prefecture | text | 都道府県 |
| address | text | 住所 |
| lat | float | 緯度 |
| lng | float | 経度 |
| capacity | int | 収容人数 |
| rakuten_area_code | text | 楽天トラベルエリアコード |
| created_at | timestamptz | 作成日時 |

#### affiliate_clicks（アフィリエイトクリック計測）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| plan_id | uuid | 対象プラン（FK to plans） |
| affiliate_type | enum | `hotel / transit / goods` |
| affiliate_partner | text | 楽天 / じゃらん / amazon 等 |
| clicked_at | timestamptz | クリック日時 |

#### plan_records（遠征記録 / v1.2）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| plan_id | uuid | FK to plans（ON DELETE CASCADE） |
| user_id | uuid | FK to users |
| memo | text | 感想・メモ |
| actual_cost | int | 実際の費用（円） |
| created_at | timestamptz | 作成日時 |

### 4.3 plan_json の構造（アフィリエイトURL対応版）

```json
{
  "summary": "東京ドーム公演 1泊2日プラン",
  "estimated_cost": 38000,
  "itinerary": [
    { "time": "07:30", "action": "新幹線のぞみ乗車（名古屋→東京）", "cost": 11000 },
    { "time": "10:30", "action": "ホテル荷物預け" },
    { "time": "13:00", "action": "物販列に並ぶ（推奨開始時刻）" },
    { "time": "18:00", "action": "開演" }
  ],
  "accommodation": {
    "name": "東京ステーションホテル",
    "area": "東京駅周辺",
    "price_approx": 8000,
    "affiliate_links": {
      "rakuten": "https://travel.rakuten.co.jp/hotel/...?af=oshiplan",
      "jalan": "https://www.jalan.net/...?afid=oshiplan"
    }
  },
  "transit": {
    "outbound": {
      "type": "shinkansen",
      "name": "のぞみ（名古屋→東京）",
      "cost": 11000,
      "duration_min": 100,
      "booking_url": "https://www.eki-net.com/..."
    },
    "return": {
      "type": "shinkansen",
      "name": "のぞみ（東京→名古屋）",
      "cost": 11000,
      "duration_min": 100,
      "booking_url": "https://www.eki-net.com/..."
    }
  },
  "merch_line_advice": "14:00頃から並ぶのを推奨。完売リスク低め。",
  "goods_links": [
    {
      "name": "推し活遠征バッグ（推奨）",
      "amazon_url": "https://www.amazon.co.jp/...?tag=oshiplan-22"
    }
  ],
  "tips": [
    "コインロッカーは東京ドームシティ内に多数あり",
    "開演前の食事は水道橋駅周辺が空いていておすすめ"
  ]
}
```

### 4.4 Row Level Security（RLS）

- **users**: `auth.uid() = id` のみ read / update 可
- **artists**: `auth.uid() = user_id` のみ CRUD 可
- **plans**:
  - 認証ユーザー: `auth.uid() = user_id` のみ CRUD 可
  - 共有アクセス: `share_token = :token` が一致すれば匿名 read 可
  - 未ログイン生成プラン: `user_id IS NULL` は制限なし read / 作成者のみ edit
- **affiliate_clicks**: INSERT は誰でも可（クリック計測のため）
- **venues**: 全員 read 可（公開データ）

---

## 5. API設計

### 5.1 エンドポイント一覧

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/users/me` | プロフィール取得 | 要 |
| PATCH | `/api/users/me` | プロフィール更新 | 要 |
| DELETE | `/api/users/me` | アカウント削除 | 要 |
| GET | `/api/artists` | 推し一覧取得 | 要 |
| POST | `/api/artists` | 推し登録 | 要 |
| PATCH | `/api/artists/:id` | 推し編集 | 要 |
| DELETE | `/api/artists/:id` | 推し削除 | 要 |
| GET | `/api/plans` | プラン一覧取得 | 要 |
| POST | `/api/plans/generate` | **AIプラン生成（コア）** | 任意 |
| GET | `/api/plans/:id` | プラン詳細取得 | 要 |
| PATCH | `/api/plans/:id` | プラン編集 | 要 |
| DELETE | `/api/plans/:id` | プラン削除 | 要 |
| POST | `/api/plans/:id/share` | 共有トークン発行 | 要 |
| DELETE | `/api/plans/:id/share` | 共有トークン無効化 | 要 |
| GET | `/api/shared/:token` | 共有プラン閲覧 | 不要 |
| POST | `/api/affiliate/click` | アフィリエイトクリック計測 | 不要 |
| GET | `/api/venues` | 会場一覧取得 | 不要 |
| GET | `/api/venues/:slug` | 会場詳細取得（周辺ホテル含む） | 不要 |

### 5.2 プラン生成APIの変更点（アフィリエイト対応）

プラン生成時に以下を追加実装する：

1. 楽天トラベルAPIで会場周辺ホテルを検索し、アフィリエイトURL付きで plan_json に格納
2. 交通手段に応じた予約サイトURLを付与
3. グッズ関連のAmazonアソシエイトリンクをtipsに付与

**レート制限（認証不要ユーザー対応）**
- 未ログインユーザー: IPアドレスベースで1日3回
- ログインユーザー: ユーザーIDベースで1日10回
- Vercel KV（Redis）でカウント管理

---

## 6. クライアント設計（Web）

### 6.1 ページ構成

| ページ | URL | 説明 | 認証 |
|--------|-----|------|------|
| トップ | `/` | サービス説明・プラン作成CTA | 不要 |
| 会場別LP | `/venue/[slug]` | 会場情報・周辺ホテル・CTA | 不要 |
| プラン作成 Step1 | `/plans/new` | 推し選択 | 任意 |
| プラン作成 Step2 | `/plans/new/event` | 公演情報入力 | 任意 |
| プラン作成 Step3 | `/plans/new/options` | オプション設定 | 任意 |
| プラン作成中 | `/plans/new/generating` | ローディング | 任意 |
| プラン確認 | `/plans/new/result` | 生成結果・保存 | 任意 |
| プラン一覧 | `/plans` | マイプラン管理 | 要 |
| プラン詳細 | `/plans/[id]` | 詳細・アフィリエイトリンク | 要 |
| 共有プラン | `/shared/[token]` | 読み取り専用 | 不要 |
| 推し一覧 | `/artists` | 推し管理 | 要 |
| 設定 | `/settings` | プロフィール・ログアウト | 要 |
| アーカイブ | `/archive` | 遠征記録（v1.2） | 要 |

### 6.2 ナビゲーション構造

モバイルファーストのレスポンシブデザイン。BottomTabBarではなく、ヘッダーナビゲーションを採用。

```
[PC]
ヘッダー: Logo | プランを作る | マイプラン | 推し登録 | ログイン/アカウント

[スマホ]
ヘッダー: Logo | ≡ ハンバーガーメニュー
フッター: 利用規約 | プライバシーポリシー | お問い合わせ
```

### 6.3 主要ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| next | App Router / SSG / SSR / API Routes |
| @supabase/supabase-js | 認証・DBクライアント |
| @tanstack/react-query | サーバー状態管理・キャッシュ |
| zustand | ローカル状態（プラン作成ウィザード状態等） |
| @anthropic-ai/sdk | Claude API クライアント |
| tailwindcss | スタイリング |
| next/image | 画像最適化 |
| react-hook-form + zod | フォームバリデーション |

---

## 7. SEO設計

### 7.1 会場別ページのSEO設定

```tsx
// app/venue/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const venue = await getVenue(params.slug)
  return {
    title: `${venue.name} 遠征プラン | OshiPlan`,
    description: `${venue.name}への推し活遠征プランをAIが自動生成。周辺ホテル・アクセス・物販情報を一括確認。`,
    openGraph: { ... }
  }
}

export async function generateStaticParams() {
  const venues = await getAllVenues()
  return venues.map(v => ({ slug: v.slug }))
}
```

### 7.2 構造化データ（Schema.org）

会場別ページに `LocalBusiness` / `Event` スキーマを付与し、リッチリザルト対応。

---

## 8. セキュリティ

### 8.1 認証・認可

- Supabase Auth（メール認証、Apple/Googleログイン）
- JWT は `httpOnly cookie` に保存（CSRFトークン併用）
- API Routes でJWT検証

### 8.2 APIキー管理

- Claude API、Google Maps API等は Vercel 環境変数で管理
- クライアントバンドルに含まれないよう Server Component / API Routes のみで使用

### 8.3 レート制限（アフィリエイト不正防止）

- AI生成: IPベース1日3回（未ログイン）/ ユーザーIDベース1日10回（ログイン）
- アフィリエイトクリック: IPベース連続クリック防止（同一リンク1時間に1カウントのみ）
- Vercel KV（Redis）でカウント管理

---

## 9. コスト試算

### 9.1 月次運用コスト（PV別）

| サービス | 5,000 PV/月 | 20,000 PV/月 | 50,000 PV/月 | 備考 |
|---------|-------------|--------------|--------------|------|
| Supabase | ¥0 | ¥3,500 | ¥3,500 | Free → Pro |
| Vercel | ¥0 | ¥0 | ¥3,000 | Hobby枠超過時 |
| Claude API | ¥1,500 | ¥5,000 | ¥12,000 | 1日3回制限込み |
| Google Maps | ¥0 | ¥0 | ¥3,000 | 月\$200クレジット |
| Sentry | ¥0 | ¥0 | ¥0 | 無料枠 |
| **合計** | **¥1,600** | **¥8,600** | **¥21,600** | |

### 9.2 LLMコスト管理戦略

- Claude Sonnet を基本利用（コストバランス良）
- 同一会場×出発地の過去プランを transit / accommodation テンプレートとして再利用
- プロンプトは可能な限り短く（コンテキストをJSON圧縮）
- 月次のAPIコスト超過アラートを Sentry / Vercel Analytics で監視

---

## 10. デプロイ・運用

### 10.1 ビルド・配布

- コードは GitHub private リポジトリで管理
- `main` ブランチへの push → Vercel が自動デプロイ
- 会場別静的ページ: `npm run build` で全ページSSG生成
- ISR（Incremental Static Regeneration）で会場データ更新時に再生成

### 10.2 監視

| ツール | 用途 |
|-------|------|
| Sentry | エラー追跡・アラート |
| Vercel Analytics | PV・Core Web Vitals・API性能 |
| Supabase Logs | DB側エラー |
| Google Search Console | SEO流入・キーワード分析 |

### 10.3 障害対応

- クリティカル障害（ログイン不可・AI生成全停止）: Sentry からメール即時通知
- 非クリティカル: 日次サマリで確認
- ユーザーサポート: サイト内お問い合わせフォーム + メール（48時間以内返信目標）

---

## 11. MVP開発タスク一覧

### Week 1: 環境構築

- [ ] Next.js 15 (App Router) + TypeScript + Tailwind CSS プロジェクト初期化
- [ ] Supabase プロジェクト作成・テーブル・RLS定義
- [ ] Vercel 連携・環境変数設定
- [ ] Claude API・Google Maps API・楽天トラベルAPI 契約

### Week 2: 基盤実装

- [ ] Supabase Auth 組み込み（メール・Apple/Google）
- [ ] ヘッダーナビゲーション・レイアウト
- [ ] デザインシステム（Tailwind コンポーネント）

### Week 3〜5: コア機能

- [ ] 推し登録・管理画面
- [ ] プラン作成ウィザード（3ステップ）
- [ ] POST /api/plans/generate 実装（Claude + Google Maps + アフィリエイトリンク生成）
- [ ] プラン詳細画面（アフィリエイトリンク表示）
- [ ] プラン一覧・編集・削除

### Week 5〜6: SEO施策

- [ ] 会場マスタデータ作成（主要50会場）
- [ ] 会場別ランディングページ（SSG）
- [ ] OGP・Schema.org 設定

### Week 7: 共有・仕上げ

- [ ] share_token 共有機能
- [ ] アフィリエイトクリック計測API
- [ ] レート制限実装（Vercel KV）

### Week 8: βテスト・リリース

- [ ] 100名クローズドβ
- [ ] フィードバック修正
- [ ] 正式公開・アフィリエイトプログラム申請
