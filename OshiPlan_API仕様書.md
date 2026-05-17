# OshiPlan API仕様書

推し活遠征プランナーアプリ

2026年5月 / Version 1.0 (MVP)

---

## 0. 概要

### ベースURL

```
https://api.oshiplan.app   （本番）
http://localhost:3000       （開発）
```

### 認証方式

Supabase Auth が発行する JWT（Bearer Token）を使用。

```http
Authorization: Bearer <supabase_access_token>
```

- 認証が必要なエンドポイントにトークンなし/期限切れでアクセスすると `401` を返す
- トークンの取得・更新は Supabase Auth SDK（クライアント側）が担当し、API Routes では検証のみ行う

### Content-Type

リクエスト・レスポンスともに `application/json`。

### レート制限

| プラン | AI生成（`/api/plans/generate`） | その他APIエンドポイント |
|--------|-------------------------------|----------------------|
| Free | 月3回 | 60 req/分 |
| Premium | 日100回（実質無制限） | 120 req/分 |

制限超過時は `429 Too Many Requests` を返す。

### 共通エラーレスポンス

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明（日本語）"
  }
}
```

| HTTPステータス | codeの例 | 説明 |
|--------------|---------|------|
| 400 | `VALIDATION_ERROR` | リクエストのバリデーション失敗 |
| 401 | `UNAUTHORIZED` | 認証トークンなし / 期限切れ |
| 403 | `FORBIDDEN` | 他ユーザーのリソースへのアクセス |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 429 | `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| 429 | `AI_QUOTA_EXCEEDED` | AI生成の月間・日次制限超過 |
| 500 | `INTERNAL_ERROR` | サーバーエラー |
| 503 | `AI_UNAVAILABLE` | Claude API が一時的に利用不可 |

---

## 1. エンドポイント一覧

| # | Method | Path | 説明 | 認証 |
|---|--------|------|------|------|
| 1 | GET | `/api/users/me` | 自分のプロフィール取得 | 要 |
| 2 | PATCH | `/api/users/me` | プロフィール更新 | 要 |
| 3 | DELETE | `/api/users/me` | アカウント削除 | 要 |
| 4 | GET | `/api/artists` | 推し一覧取得 | 要 |
| 5 | POST | `/api/artists` | 推し登録 | 要 |
| 6 | PATCH | `/api/artists/:id` | 推し編集 | 要 |
| 7 | DELETE | `/api/artists/:id` | 推し削除 | 要 |
| 8 | GET | `/api/plans` | プラン一覧取得 | 要 |
| 9 | POST | `/api/plans/generate` | AIプラン生成 | 要 |
| 10 | GET | `/api/plans/:id` | プラン詳細取得 | 要 |
| 11 | PATCH | `/api/plans/:id` | プラン編集 | 要 |
| 12 | DELETE | `/api/plans/:id` | プラン削除 | 要 |
| 13 | POST | `/api/plans/:id/share` | 共有トークン発行 | 要 |
| 14 | DELETE | `/api/plans/:id/share` | 共有トークン無効化 | 要 |
| 15 | GET | `/api/shared/:token` | 共有プラン閲覧 | 不要 |
| 16 | POST | `/api/webhooks/revenuecat` | RevenueCat課金イベント受信 | 署名検証 |

---

## 2. ユーザー

### 2.1 GET `/api/users/me` — プロフィール取得

**説明**：ログイン中のユーザー情報を返す。

**レスポンス 200**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "推し活太郎",
  "home_station": "名古屋駅",
  "subscription_tier": "free",
  "monthly_ai_used": 1,
  "monthly_ai_limit": 3,
  "created_at": "2026-05-01T00:00:00Z"
}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| subscription_tier | `"free"` \| `"premium_monthly"` \| `"premium_yearly"` | 現在のプラン |
| monthly_ai_used | number | 当月のAI生成利用回数 |
| monthly_ai_limit | number | 当月の上限（Free: 3、Premium: 100） |

---

### 2.2 PATCH `/api/users/me` — プロフィール更新

**リクエストボディ**

```json
{
  "display_name": "推し活太郎",
  "home_station": "名古屋駅"
}
```

| フィールド | 必須 | バリデーション |
|-----------|------|--------------|
| display_name | 任意 | 1〜30文字 |
| home_station | 任意 | 最大50文字 |

**レスポンス 200**：更新後のユーザーオブジェクト（2.1と同形式）

---

### 2.3 DELETE `/api/users/me` — アカウント削除

**説明**：ユーザーの全データ（plans / artists / plan_records / notifications）を削除し、Supabase Auth のアカウントも削除する。

**レスポンス 204**：No Content

**注意**：削除は即時かつ不可逆。RevenueCat 側の解約は別途ユーザーがストアから行う。

---

## 3. 推し（Artists）

### 3.1 GET `/api/artists` — 推し一覧取得

**レスポンス 200**

```json
{
  "artists": [
    {
      "id": "uuid",
      "name": "推し A",
      "category": "idol",
      "created_at": "2026-05-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "推し B",
      "category": "anime",
      "created_at": "2026-05-02T00:00:00Z"
    }
  ]
}
```

---

### 3.2 POST `/api/artists` — 推し登録

**リクエストボディ**

```json
{
  "name": "推し A",
  "category": "idol"
}
```

| フィールド | 必須 | バリデーション |
|-----------|------|--------------|
| name | ✅ | 1〜50文字 |
| category | ✅ | `idol` \| `artist` \| `2.5d` \| `anime` \| `sports` \| `other` |

**レスポンス 201**

```json
{
  "id": "uuid",
  "name": "推し A",
  "category": "idol",
  "created_at": "2026-05-17T00:00:00Z"
}
```

---

### 3.3 PATCH `/api/artists/:id` — 推し編集

**リクエストボディ**（変更するフィールドのみ）

```json
{
  "name": "推し A（改名後）",
  "category": "artist"
}
```

**レスポンス 200**：更新後の推しオブジェクト

**エラー**
- `404`：指定した推しが存在しない、または自分の推しでない

---

### 3.4 DELETE `/api/artists/:id` — 推し削除

**レスポンス 204**：No Content

**注意**：推しを削除しても、紐づくプランは削除されない（`artist_id` は保持、プラン一覧では「削除済みの推し」として表示）。

---

## 4. プラン（Plans）

### 4.1 GET `/api/plans` — プラン一覧取得

**クエリパラメータ**

| パラメータ | 型 | デフォルト | 説明 |
|----------|---|---------|------|
| type | `"upcoming"` \| `"past"` | `"upcoming"` | 未来（event_date >= 今日）/ 過去の切替 |
| limit | number | 20 | 取得件数（最大50） |
| offset | number | 0 | ページネーション用オフセット |

**レスポンス 200**

```json
{
  "plans": [
    {
      "id": "uuid",
      "artist_id": "uuid",
      "artist_name": "推し A",
      "event_name": "○○ ARENA TOUR 2026",
      "venue_name": "東京ドーム",
      "event_date": "2026-08-15",
      "event_time": "18:00",
      "departure": "名古屋駅",
      "estimated_cost": 38000,
      "share_token": null,
      "is_archived": false,
      "created_at": "2026-05-17T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### 4.2 POST `/api/plans/generate` — AIプラン生成 ⭐コア

**説明**：公演情報を受け取り、Claude API を使って遠征プランを生成・保存して返す。

**リクエストボディ**

```json
{
  "artist_id": "uuid",
  "event_name": "○○ ARENA TOUR 2026",
  "venue_hint": "東京ドーム",
  "event_date": "2026-08-15",
  "event_time": "18:00",
  "departure": "名古屋駅",
  "budget_hint": 40000,
  "options": {
    "stay_overnight": true,
    "merch": true,
    "pilgrimage": false
  }
}
```

| フィールド | 必須 | バリデーション |
|-----------|------|--------------|
| artist_id | ✅ | 自分の artists テーブルに存在するUUID |
| event_name | ✅ | 1〜80文字 |
| venue_hint | ✅ | 1〜80文字 |
| event_date | ✅ | `YYYY-MM-DD`、今日以降 |
| event_time | — | `HH:MM`形式 |
| departure | ✅ | 1〜50文字（未指定時は `users.home_station` を使用） |
| budget_hint | — | 0以上の整数（円） |
| options.stay_overnight | — | boolean（デフォルト: false） |
| options.merch | — | boolean（デフォルト: false） |
| options.pilgrimage | — | boolean（デフォルト: false） |

**サーバー側処理フロー**

```
1. JWT検証
2. 利用枠確認（Free: monthly_ai_used >= 3 → 429）
3. キャッシュ確認（同一会場×出発地の過去プランがあれば部分流用）
4. Google Maps API で会場座標・周辺情報を取得
5. プロンプト構築 → Claude API（claude-sonnet-4-6）に送信
6. レスポンスを plan_json スキーマで Zod バリデーション
7. バリデーション失敗時は最大2回リトライ
8. plans テーブルに INSERT
9. users.monthly_ai_used をインクリメント
10. 生成したプランを返却
```

**レスポンス 201**

```json
{
  "id": "uuid",
  "artist_id": "uuid",
  "artist_name": "推し A",
  "event_name": "○○ ARENA TOUR 2026",
  "venue_name": "東京ドーム",
  "event_date": "2026-08-15",
  "event_time": "18:00",
  "departure": "名古屋駅",
  "budget_hint": 40000,
  "plan_json": {
    "summary": "東京ドーム公演 1泊2日プラン",
    "estimated_cost": 38000,
    "itinerary": [
      { "time": "07:30", "action": "新幹線のぞみ乗車（名古屋→東京）", "cost": 11000 },
      { "time": "10:30", "action": "ホテル荷物預け（東京ステーションホテル）", "cost": null },
      { "time": "13:00", "action": "物販列に並ぶ（推奨開始時刻、4時間待ち想定）", "cost": null },
      { "time": "17:30", "action": "開場", "cost": null },
      { "time": "18:00", "action": "開演", "cost": null },
      { "time": "21:00", "action": "終演・ホテルへ移動", "cost": null }
    ],
    "accommodation": {
      "name": "東京ステーションホテル",
      "price": 8000,
      "booking_url": "https://..."
    },
    "transit": {
      "outbound": { "type": "shinkansen", "name": "のぞみ", "cost": 11000, "duration_min": 100 },
      "return": { "type": "shinkansen", "name": "のぞみ", "cost": 11000, "duration_min": 100 }
    },
    "merch_line_advice": "16:00頃に並ぶ層が多い。完売リスク低めのため14:00開始推奨。",
    "tips": [
      "コインロッカーは東京ドームシティ内に多数あり",
      "開演前の食事は水道橋駅周辺が空いていておすすめ"
    ]
  },
  "share_token": null,
  "is_archived": false,
  "created_at": "2026-05-17T10:00:00Z"
}
```

**エラーケース**

| コード | 状況 |
|--------|------|
| `429 AI_QUOTA_EXCEEDED` | Free枠（月3回）を超過 |
| `503 AI_UNAVAILABLE` | Claude API がタイムアウト or エラー（利用回数はカウントしない） |
| `400 VALIDATION_ERROR` | リクエストのバリデーション失敗 |

---

### 4.3 GET `/api/plans/:id` — プラン詳細取得

**レスポンス 200**：`POST /api/plans/generate` のレスポンスと同形式

---

### 4.4 PATCH `/api/plans/:id` — プラン編集

**説明**：`plan_json` の内容を手動で更新する（行程・宿・アドバイスの修正）。

**リクエストボディ**

```json
{
  "plan_json": {
    "summary": "東京ドーム公演 1泊2日プラン（修正版）",
    "estimated_cost": 40000,
    "itinerary": [
      { "time": "07:00", "action": "新幹線のぞみ乗車（名古屋→東京）", "cost": 11000 },
      { "time": "11:00", "action": "ホテル荷物預け", "cost": null }
    ],
    "accommodation": {
      "name": "丸ノ内ホテル",
      "price": 12000,
      "booking_url": "https://..."
    },
    "transit": { "outbound": {}, "return": {} },
    "merch_line_advice": "13:00頃から並ぶのを推奨。",
    "tips": ["修正済みのtips"]
  }
}
```

**レスポンス 200**：更新後のプランオブジェクト（4.2と同形式）

**エラー**
- `400 VALIDATION_ERROR`：`plan_json` が必須フィールドを欠く

---

### 4.5 DELETE `/api/plans/:id` — プラン削除

**レスポンス 204**：No Content

紐づく `plan_records` も CASCADE で削除される。

---

### 4.6 POST `/api/plans/:id/share` — 共有トークン発行

**説明**：プランに `share_token` を発行し、公開URLを返す。既にトークンがある場合は再発行（古いトークンは無効化）。

**リクエストボディ**：不要

**レスポンス 200**

```json
{
  "share_token": "abc123xyz",
  "share_url": "https://oshiplan.app/shared/abc123xyz"
}
```

**制限**：Freeプランは共有リンク発行不可 → `403 FORBIDDEN`（`code: "PREMIUM_REQUIRED"`）

---

### 4.7 DELETE `/api/plans/:id/share` — 共有トークン無効化

**説明**：`share_token` を削除し、共有URLをアクセス不能にする。

**レスポンス 204**：No Content

---

## 5. 共有プラン（認証不要）

### 5.1 GET `/api/shared/:token` — 共有プラン閲覧

**説明**：`share_token` に対応するプランを認証なしで読み取り専用で返す。

**レスポンス 200**

```json
{
  "event_name": "○○ ARENA TOUR 2026",
  "venue_name": "東京ドーム",
  "event_date": "2026-08-15",
  "event_time": "18:00",
  "plan_json": { ... },
  "shared_at": "2026-05-17T10:00:00Z"
}
```

**注意**：`user_id` / `artist_id` など個人情報に紐づくフィールドは返さない。

**エラー**
- `404 NOT_FOUND`：トークンが存在しない or 無効化済み

---

## 6. Webhook

### 6.1 POST `/api/webhooks/revenuecat` — 課金イベント受信

**説明**：RevenueCat からの課金ステータス変更を受け取り、`users.subscription_tier` と `subscriptions` テーブルを更新する。

**認証**：Bearer Token ではなく、RevenueCat の Webhook Authorization Header で署名検証を行う。

```http
Authorization: <revenuecat_webhook_secret>
```

**リクエストボディ**（RevenueCat 標準フォーマット）

```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "app_user_id": "<supabase_user_uuid>",
    "product_id": "oshiplan_premium_monthly",
    "expiration_at_ms": 1767225600000,
    "environment": "PRODUCTION"
  }
}
```

**対応する `event.type`**

| type | 処理内容 |
|------|---------|
| `INITIAL_PURCHASE` | `subscription_tier` を `premium_monthly` or `premium_yearly` に更新、`subscriptions` に INSERT |
| `RENEWAL` | `subscriptions` の `expires_at` を更新 |
| `CANCELLATION` | 期限切れ後に `subscription_tier` を `free` に戻す（即時変更ではない） |
| `EXPIRATION` | `subscription_tier` を `free` に更新 |
| `BILLING_ISSUE` | 課金失敗の記録（サービスは継続し、次回請求を待つ） |

**レスポンス 200**：`{ "received": true }`

**エラー**
- `401`：署名検証失敗
- `400`：不明な event.type（無視してログのみ記録）

---

## 7. スキーマ定義

### 7.1 plan_json スキーマ（Zodによるバリデーション）

```typescript
const ItineraryItem = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),  // "HH:MM"
  action: z.string().min(1).max(200),
  cost: z.number().int().nonnegative().nullable(),
});

const Accommodation = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().nonnegative(),
  booking_url: z.string().url().nullable(),
});

const TransitInfo = z.object({
  type: z.enum(["shinkansen", "airplane", "bus", "local", "other"]),
  name: z.string(),
  cost: z.number().int().nonnegative(),
  duration_min: z.number().int().positive(),
});

const PlanJson = z.object({
  summary: z.string().min(1).max(200),
  estimated_cost: z.number().int().nonnegative(),
  itinerary: z.array(ItineraryItem).min(1).max(20),
  accommodation: Accommodation.nullable(),
  transit: z.object({
    outbound: TransitInfo.nullable(),
    return: TransitInfo.nullable(),
  }),
  merch_line_advice: z.string().max(500).nullable(),
  tips: z.array(z.string().max(200)).max(10),
});
```

### 7.2 subscription_tier の値

| 値 | 説明 |
|----|------|
| `"free"` | 無料プラン（デフォルト） |
| `"premium_monthly"` | 月額480円のPremiumプラン |
| `"premium_yearly"` | 年額4,800円のPremiumプラン |

### 7.3 artist category の値

| 値 | 表示名 |
|----|--------|
| `"idol"` | アイドル |
| `"artist"` | アーティスト |
| `"2.5d"` | 2.5次元 |
| `"anime"` | アニメ |
| `"sports"` | スポーツ |
| `"other"` | その他 |

---

## 8. LLMプロンプト設計（参考）

### 8.1 システムプロンプト

```
あなたは推し活遠征に精通した日本の旅行プランナーです。
ユーザーが入力した公演情報をもとに、最適な遠征プランをJSON形式で作成してください。

【ルール】
- 違法行為（転売・不法侵入・個人宅の特定等）を助長する内容は含めないこと
- 情報は一般的な知識に基づくこと（確定情報として断言しないこと）
- 宿泊や交通の価格は概算であることを前提とすること
- 回答は必ず指定のJSONスキーマに従うこと
```

### 8.2 ユーザープロンプト（動的生成）

```
以下の公演情報をもとに遠征プランを作成してください。

【公演情報】
- 公演名: {{event_name}}
- 会場: {{venue_name}}（{{venue_address}}）
- 公演日: {{event_date}} {{event_time}}
- 出発地: {{departure}}
- 予算目安: {{budget_hint}}円

【オプション】
- 宿泊: {{stay_overnight}}
- 物販: {{merch}}
- 聖地巡礼: {{pilgrimage}}

【会場周辺情報（Google Maps取得）】
{{maps_context}}

【出力形式】
以下のJSONスキーマに厳密に従って出力してください:
{{plan_json_schema}}
```

---

## 9. 実装メモ

### 月次リセット（Supabase Scheduled Function）

毎月1日0時（JST）に `users.monthly_ai_used` を一括で0にリセットする。

```sql
UPDATE users SET monthly_ai_used = 0;
```

Supabase の `pg_cron` 拡張、または Vercel Cron Jobs で実装。

### キャッシュ戦略（AI生成コスト削減）

同一の `venue_name` × `departure` の組み合わせで過去30日以内に生成されたプランがある場合、`transit` / `accommodation` の基礎情報を再利用してプロンプトに注入することで、AI への出力量を削減する。

### タイムアウト処理

- Claude API への接続タイムアウト：10秒
- タイムアウト時は `503 AI_UNAVAILABLE` を返し、`monthly_ai_used` は**カウントしない**

### share_token 生成

```typescript
import { randomBytes } from "crypto";
const token = randomBytes(16).toString("hex"); // 32文字の16進数
```

---

## 10. cURL サンプル集

### プロフィール取得

```bash
curl -X GET https://api.oshiplan.app/api/users/me \
  -H "Authorization: Bearer <token>"
```

### 推し登録

```bash
curl -X POST https://api.oshiplan.app/api/artists \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "推し A", "category": "idol"}'
```

### AIプラン生成

```bash
curl -X POST https://api.oshiplan.app/api/plans/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "artist_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "event_name": "○○ ARENA TOUR 2026",
    "venue_hint": "東京ドーム",
    "event_date": "2026-08-15",
    "event_time": "18:00",
    "departure": "名古屋駅",
    "budget_hint": 40000,
    "options": {
      "stay_overnight": true,
      "merch": true,
      "pilgrimage": false
    }
  }'
```

### 共有トークン発行

```bash
curl -X POST https://api.oshiplan.app/api/plans/<plan_id>/share \
  -H "Authorization: Bearer <token>"
```

### 共有プラン閲覧（認証不要）

```bash
curl -X GET https://api.oshiplan.app/api/shared/abc123xyz
```
