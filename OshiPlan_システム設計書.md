# OshiPlan システム設計書

推し活遠征プランナーアプリ

2026年5月 / Version 1.0 (MVP)

---

## 1. システム概要

OshiPlanは、ユーザーが入力した推し活の公演情報をもとに、AIが遠征計画を自動生成・管理するクロスプラットフォームモバイルアプリ。

### 1.1 設計方針

- 個人開発として最小コスト・最小運用負荷で立ち上げる
- サーバーレス・マネージドサービス中心の構成
- AI APIコールはサーバー側で実施し、APIキーをクライアントに露出させない
- LLMコスト管理を最優先（キャッシュ・レート制限・利用枠制御）
- コード共通化のためクロスプラットフォーム開発フレームワークを採用

### 1.2 主要な非機能要件

| 項目 | 要件 |
|------|------|
| 可用性 | 月次稼働率99%以上（個人開発レベル） |
| 性能 | AIプラン生成は10秒以内に完了、画面遷移1秒以内 |
| セキュリティ | 通信HTTPS、認証はOAuth/PKCE、APIキーはサーバー側のみ保持 |
| プライバシー | 個人情報保護法準拠、最小限の取得、明確な利用規約 |
| スケーラビリティ | MAU 30,000まで構成変更なしで対応 |
| コスト | 月次インフラ＋API合計を売上の30%以下に維持 |

---

## 2. システムアーキテクチャ

### 2.1 全体構成

クライアント（モバイルアプリ）→ Edge API → バックエンドサービス（Supabase / LLM / 外部API）の3層構成。

```
┌────────────────────────────────────────────────────┐
│           Mobile App (iOS / Android)               │
│         React Native + Expo                        │
│         State: TanStack Query + Zustand            │
└─────────────────────┬──────────────────────────────┘
                      │ HTTPS (REST)
                      ▼
┌────────────────────────────────────────────────────┐
│        Edge API Layer (Vercel Edge Functions)      │
│        認証検証 / レート制限 / キャッシュ           │
│        LLMプロンプト構築・実行                      │
└──────┬────────────┬──────────────┬─────────────────┘
       ▼            ▼              ▼
┌────────────┐ ┌──────────┐ ┌──────────────┐
│  Supabase  │ │  Claude  │ │ Google Maps  │
│  DB + Auth │ │   API    │ │ /楽天トラベル │
└────────────┘ └──────────┘ └──────────────┘

┌────────────┐
│ RevenueCat │  ← ストア課金管理
└────────────┘
```

### 2.2 技術スタック選定

| レイヤー | 採用技術 | 選定理由 |
|---------|---------|---------|
| クライアント | React Native + Expo | iOS/Android同時開発、Expo EAS BuildでCI簡略化 |
| 状態管理 | TanStack Query + Zustand | サーバー状態とローカル状態の分離、学習コスト低 |
| UIライブラリ | NativeWind (Tailwind for RN) | デザイン速度、AI駆動開発との相性 |
| Edge API | Vercel Edge Functions / Hono | 低レイテンシ、無料枠が充実 |
| DB / 認証 | Supabase | Postgres+認証+ストレージを一体で提供、無料枠大 |
| LLM | Anthropic Claude API | 日本語精度・推論品質、Claude Code利用者で習熟済 |
| ストア課金 | RevenueCat | iOS/Android両ストア課金を一元管理、無料枠あり |
| プッシュ通知 | Expo Push Notifications | FCM/APNsを抽象化、無料 |
| 地図 | Google Maps Platform | 経路・場所検索の業界標準、月$200無料クレジット |
| 監視 | Sentry + Vercel Analytics | エラー追跡、無料枠で十分 |
| CI/CD | GitHub Actions + Expo EAS | コードpush→自動ビルド/配布 |

---

## 3. データモデル

### 3.1 ER概要

中心は `users`, `plans`, `events`。システムの中心は遠征プラン（plan）であり、ユーザーが推し（artist）の公演（event）について作成する。

### 3.2 主要テーブル

#### users

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | Supabase Auth連動の主キー |
| email | text | 認証メール |
| display_name | text | 表示名 |
| home_station | text | 最寄り駅（プラン生成の起点） |
| subscription_tier | enum | `free` / `premium_monthly` / `premium_yearly` |
| monthly_ai_used | int | 当月のAI生成利用回数（フリー枠管理） |
| created_at | timestamptz | 作成日時 |

#### artists（推し）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| name | text | 推しの名称 |
| category | enum | `idol` / `artist` / `2.5d` / `anime` / `sports` / `other` |
| user_id | uuid | 登録ユーザー（FK to users） |

#### plans（遠征プラン）

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid | 主キー |
| user_id | uuid | 作成者 |
| artist_id | uuid | 対象推し |
| event_name | text | 公演名 |
| venue_name | text | 会場名 |
| event_date | date | 公演日 |
| event_time | time | 開演時刻 |
| plan_json | jsonb | AI生成プラン本体（行程・宿・物販等） |
| share_token | text | 共有用ランダムトークン |
| created_at | timestamptz | 作成日時 |

### 3.3 plan_json の構造

AIから返却される構造化データ。スキーマでバリデーション。

```json
{
  "summary": "東京ドーム公演 1泊2日プラン",
  "estimated_cost": 38000,
  "itinerary": [
    { "time": "07:30", "action": "新幹線のぞみ乗車（名古屋→東京）", "cost": 11000 },
    { "time": "10:30", "action": "ホテル荷物預け（東京ステーションホテル）" },
    { "time": "13:00", "action": "物販列に並ぶ（推奨開始時刻、4時間待ち想定）" },
    { "time": "18:00", "action": "開演" }
  ],
  "accommodation": { "name": "...", "price": 8000, "booking_url": "..." },
  "transit": { "outbound": {}, "return": {} },
  "merch_line_advice": "16:00頃に並ぶ層が多い。完売リスク低めのため14:00開始推奨。",
  "tips": ["コインロッカーは...", "推奨ご飯処は..."]
}
```

### 3.4 Row Level Security（RLS）

Supabase標準のRLSを必須有効化。ポリシー例：

- **plans**：ユーザーは自分のレコードのみread/write可。`share_token` が一致する場合のみ匿名アクセスでread可
- **artists**：ユーザーは自分のレコードのみアクセス可
- **users**：自分のレコードのみread/update可

---

## 4. API設計

### 4.1 エンドポイント一覧

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/plans/generate` | AIで遠征プラン生成 |
| GET | `/api/plans` | 自分のプラン一覧取得 |
| GET | `/api/plans/:id` | プラン詳細取得 |
| PATCH | `/api/plans/:id` | プラン編集 |
| DELETE | `/api/plans/:id` | プラン削除 |
| POST | `/api/plans/:id/share` | 共有トークン発行 |
| GET | `/api/shared/:token` | 共有プラン閲覧（認証不要） |
| POST | `/api/artists` | 推し登録 |
| POST | `/api/webhooks/revenuecat` | 課金イベント受信 |

### 4.2 プラン生成API詳細

最重要エンドポイント。

#### リクエスト

```http
POST /api/plans/generate
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "artist_id": "uuid",
  "event_name": "○○ ARENA TOUR 2026",
  "venue_hint": "東京ドーム",
  "event_date": "2026-08-15",
  "event_time": "18:00",
  "departure": "名古屋駅",
  "budget_hint": 40000,
  "options": { "stay_overnight": true, "merch": true, "pilgrimage": false }
}
```

#### 処理フロー

1. JWT検証（Supabase）
2. ユーザーの利用枠確認（freeなら月3回まで）
3. キャッシュ確認（同一会場+同一出発地の過去プランがあれば部分流用）
4. Google Maps APIで会場・経路・周辺情報を取得
5. プロンプトを組み立て、Claude APIに送信
6. JSONスキーマでバリデーション、失敗時は再試行（最大2回）
7. DBに保存し、レスポンス返却
8. 利用回数カウントアップ

#### LLMプロンプト設計

構造化出力のため、ツール呼び出し（Tool Use）またはJSONモードを利用。プロンプト要件：

- **システムプロンプト**：推し活遠征に特化した日本の旅行プランナーとして振る舞う
- **コンテキスト**：Google Mapsから取得した会場座標、周辺の宿、駅情報をプロンプトに注入
- **出力指定**：上記 `plan_json` スキーマでJSONを返却
- **ガードレール**：法令違反・違法転売の助長・特定個人の住所推測等を禁止

### 4.3 レート制限

| プラン | AI生成 | 通常API |
|--------|--------|---------|
| Free | 月3回 | 60リクエスト/分 |
| Premium | 実質無制限（不正対策で日100回） | 120リクエスト/分 |

---

## 5. クライアント設計

### 5.1 画面構成

- **ホーム**：直近の遠征予定、未来のプラン一覧
- **プラン作成**：公演情報入力 → AI生成 → 結果表示・編集
- **プラン詳細**：行程・地図・宿・物販タイム・共有
- **推し一覧**：登録した推しを管理
- **アーカイブ**：過去の遠征記録、年間サマリ
- **設定**：プラン変更、課金管理、最寄り駅設定、ログアウト

### 5.2 オフライン対応

遠征当日の会場で電波が悪いケースに備え、表示中のプラン詳細はローカルキャッシュ（AsyncStorage）に保持。

### 5.3 主要ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| expo-router | ファイルベースルーティング |
| @tanstack/react-query | サーバー状態管理・キャッシュ |
| zustand | ローカル状態（UIフラグ等） |
| react-native-maps | 地図表示 |
| react-native-purchases (RevenueCat) | ストア課金 |
| expo-notifications | プッシュ通知 |
| @supabase/supabase-js | 認証・DBクライアント |

---

## 6. セキュリティ

### 6.1 認証・認可

- Supabase Authを利用（メール認証、Apple/Googleソーシャルログイン）
- クライアントはアクセストークン（JWT）をセキュアストア（expo-secure-store）に保存
- Edge API側でJWTを検証してから処理を実行
- DBアクセスは全てRLSで保護

### 6.2 APIキー管理

- Claude API、Google Maps API等の秘密キーはVercel環境変数で管理
- クライアントには絶対に配布しない
- Google Mapsのクライアント側キーはアプリバンドルID制限で保護

### 6.3 個人情報保護

- 取得情報を必要最小限に絞る（メール、表示名、最寄り駅程度）
- プライバシーポリシーをApp Store/Google Play要件に準拠して作成
- ユーザー削除要求に対応するアカウント削除機能を実装
- Apple Privacy Manifest対応必須

### 6.4 不正利用対策

- AI生成APIに重課金させる攻撃に備え、レート制限と利用枠管理を多層化
- 複数アカウント不正対策：Apple/Googleの登録IDで重複検知
- プロンプトインジェクション対策：システムプロンプトでガードレール、出力スキーマで検証

---

## 7. コスト試算

### 7.1 月次運用コスト（MAU別）

| サービス | MAU 1,000 | MAU 10,000 | MAU 30,000 | 備考 |
|---------|-----------|------------|------------|------|
| Supabase | ¥0 | ¥3,500 | ¥3,500 | Free → Pro |
| Vercel | ¥0 | ¥0 | ¥3,000 | Hobby枠超過時 |
| Claude API | ¥3,000 | ¥15,000 | ¥40,000 | Sonnet前提 |
| Google Maps | ¥0 | ¥0 | ¥5,000 | 月$200クレジット |
| RevenueCat | ¥0 | ¥0 | ¥0 | 売上$2,500まで無料 |
| Sentry等 | ¥0 | ¥0 | ¥1,500 | 無料枠 |
| **合計** | **¥3,000** | **¥18,500** | **¥53,000** | |

> MAU 10,000時の売上（粗利込み）約19万円、コスト約2万円。ストア手数料を引いても十分黒字。

### 7.2 LLMコスト管理戦略

- Claude Sonnetを基本利用（入力高品質、コストバランス良）
- シンプルケースはHaikuにフォールバック
- プロンプトは可能な限り短く、コンテキストはJSON圧縮
- 同一会場の生成結果を会場テンプレートとして再利用（個人情報を除いたパターンを蓄積）
- 月次のAPIコスト超過アラートを監視

---

## 8. デプロイ・運用

### 8.1 ビルド・配布

- コードはGitHub privateリポジトリで管理
- Expo EAS Buildでクラウドビルド、TestFlight/Google Play Internal Testingで内部配布
- リリースはGit tag起点でGitHub Actions経由

### 8.2 監視

| ツール | 用途 |
|-------|------|
| Sentry | エラー追跡、リリースバージョン別の品質モニタリング |
| Vercel Analytics | API性能、トラフィック傾向 |
| Supabase Logs | DB側エラー |
| RevenueCat Dashboard | 課金・解約状況 |

### 8.3 障害対応

個人開発のため24時間体制は不可能。以下方針：

- **クリティカル障害**（決済不能、ログイン不可）：Sentryからメール即時通知
- **非クリティカル障害**：日次サマリで確認
- **ユーザーサポート**：アプリ内お問い合わせ＋メール対応（48時間以内返信目標）

---

## 9. MVP開発タスク一覧

### Week 1：環境構築

- [ ] Expo + TypeScript プロジェクト初期化
- [ ] Supabaseプロジェクト作成、テーブル・RLS定義
- [ ] Vercel連携、環境変数設定
- [ ] Anthropic API契約、RevenueCat設定

### Week 2：認証・基盤

- [ ] Supabase Auth組み込み（メール認証＋Apple/Googleログイン）
- [ ] expo-routerで画面遷移の骨格
- [ ] デザインシステム（カラー、タイポ、共通コンポーネント）

### Week 3〜6：コア機能

- [ ] 推し登録画面
- [ ] プラン作成フォーム
- [ ] Edge API：`/api/plans/generate` 実装
- [ ] Claudeプロンプト・JSONスキーマ実装
- [ ] Google Maps連携（経路・周辺検索）
- [ ] プラン詳細画面（行程・地図表示）
- [ ] プラン一覧・編集・削除

### Week 7〜8：共有・課金

- [ ] `share_token` による共有リンク機能
- [ ] RevenueCat組み込み、サブスク購入フロー
- [ ] 利用枠管理ロジック（月次リセット）

### Week 9〜10：リリース準備

- [ ] プライバシーポリシー・利用規約作成
- [ ] App Store / Google Play審査用アセット作成
- [ ] βテスト・修正
- [ ] ストア提出、審査対応

---

## 10. 補足

### 10.1 将来の拡張余地

- **AIエージェント化**：Claude Agent SDKでチケット先行抽選代行など自動アクション
- **音声入力**：「来月の福岡公演の遠征プラン作って」と話しかけるだけで生成
- **コミュニティ機能**：同公演参戦者の匿名グルチャ
- **B2B展開**：会場運営者・地方自治体への「来場者導線分析データ」提供

### 10.2 開発参考資料

- [Expo公式ドキュメント](https://docs.expo.dev)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Anthropic Claude API](https://docs.claude.com)
- [RevenueCat](https://www.revenuecat.com/docs)
