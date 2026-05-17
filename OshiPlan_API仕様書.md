# OshiPlan API仕様書

推し活遠征プランナーWebサービス

2026年5月 / Version 2.0

---

## 0. 概要

### ベースURL

```
https://oshiplan.app/api   （本番）
http://localhost:3000/api  （開発）
```

### 実装基盤

**Next.js API Routes**（Vercel Edge Runtime）。Hono は不使用。Next.js の `app/api/` ディレクトリに実装する。

### 認証方式

Supabase Auth が発行する JWT を **httpOnly cookie** に保存。

```http
Cookie: sb-access-token=<jwt>
```

- SSRページは `createServerClient` で cookie からJWT取得
- API Routes は `createRouteHandlerClient` で検証
- 認証不要エンドポイントはトークンなしで動作

### Content-Type

リクエスト・レスポンスともに `application/json`。

### レート制限（Vercel KV / Redis）

| ユーザー種別 | AI生成 `/api/plans/generate` | その他API |
|------------|------------------------------|---------|
| 未ログイン（IPベース） | 1日3回 | 60 req/分 |
| ログイン済み（ユーザーIDベース） | 1日10回 | 120 req/分 |

> **変更点（旧仕様との差異）**: サブスクリプション廃止に伴い、月単位の制限から1日単位の制限に変更。未ログインでも利用可能。

### 共通エラーレスポンス

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明（日本語）"
  }
}
```

| HTTPステータス | code | 説明 |
|--------------|------|------|
| 400 | `VALIDATION_ERROR` | リクエストのバリデーション失敗 |
| 401 | `UNAUTHORIZED` | 認証トークンなし / 期限切れ |
| 403 | `FORBIDDEN` | 他ユーザーのリソースへのアクセス |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 429 | `RATE_LIMIT_EXCEEDED` | レート制限超過（1日の上限に達した） |
| 500 | `INTERNAL_ERROR` | サーバーエラー |
| 503 | `AI_UNAVAILABLE` | Claude API が一時的に利用不可 |

---

## 1. エンドポイント一覧

| # | Method | Path | 説明 | 認証 |
|---|--------|------|------|------|
| 1 | GET | `/api/users/me` | プロフィール取得 | 要 |
| 2 | PATCH | `/api/users/me` | プロフィール更新 | 要 |
| 3 | DELETE | `/api/users/me` | アカウント削除 | 要 |
| 4 | GET | `/api/artists` | 推し一覧取得 | 要 |
| 5 | POST | `/api/artists` | 推し登録 | 要 |
| 6 | PATCH | `/api/artists/:id` | 推し編集 | 要 |
| 7 | DELETE | `/api/artists/:id` | 推し削除 | 要 |
| 8 | GET | `/api/plans` | プラン一覧取得 | 要 |
| 9 | **POST** | `/api/plans/generate` | **AIプラン生成（コア）** | 任意 |
| 10 | GET | `/api/plans/:id` | プラン詳細取得 | 要 |
| 11 | PATCH | `/api/plans/:id` | プラン編集 | 要 |
| 12 | DELETE | `/api/plans/:id` | プラン削除 | 要 |
| 13 | POST | `/api/plans/:id/share` | 共有トークン発行 | 要 |
| 14 | DELETE | `/api/plans/:id/share` | 共有トークン無効化 | 要 |
| 15 | GET | `/api/shared/:token` | 共有プラン閲覧 | 不要 |
| 16 | **POST** | `/api/affiliate/click` | **アフィリエイトクリック計測** | 不要 |
| 17 | GET | `/api/venues` | 会場一覧取得（SSG用） | 不要 |
| 18 | GET | `/api/venues/:slug` | 会場詳細＋周辺ホテル取得 | 不要 |

> **削除**: `POST /api/webhooks/revenuecat`（課金廃止のため）
> **追加**: `POST /api/affiliate/click`、`GET /api/venues`、`GET /api/venues/:slug`

---

## 2. ユーザー

### 2.1 GET `/api/users/me` — プロフィール取得

**レスポンス 200**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "推し活太郎",
  "home_station": "名古屋駅",
  "daily_ai_used": 2,
  "daily_ai_limit": 10,
  "created_at": "2026-05-01T00:00:00Z"
}
```

| フィールド | 説明 |
|-----------|------|
| daily_ai_used | 本日のAI生成利用回数 |
| daily_ai_limit | 本日の上限（ログインユーザー: 10） |

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

---

### 2.3 DELETE `/api/users/me` — アカウント削除

- 全データ（plans / artists / plan_records / affiliate_clicks）を削除
- Supabase Auth のアカウントも削除
- **レスポンス 204**

---

## 3. 推し（Artists）

### 3.1 GET `/api/artists`

**レスポンス 200**

```json
{
  "artists": [
    { "id": "uuid", "name": "推し A", "category": "idol", "created_at": "..." },
    { "id": "uuid", "name": "推し B", "category": "anime", "created_at": "..." }
  ]
}
```

### 3.2 POST `/api/artists`

```json
{ "name": "推し A", "category": "idol" }
```

バリデーション: name 1〜50文字必須、category は enum 値のみ。**レスポンス 201**。

### 3.3 PATCH `/api/artists/:id`

変更フィールドのみ送信。他ユーザーの推しは 403。

### 3.4 DELETE `/api/artists/:id`

紐づくプランは削除しない（artist_id は保持）。**レスポンス 204**。

---

## 4. プラン（Plans）

### 4.1 GET `/api/plans`

**クエリパラメータ**

| パラメータ | デフォルト | 説明 |
|----------|---------|------|
| type | `upcoming` | `upcoming` / `past` |
| limit | 20 | 最大50 |
| offset | 0 | ページネーション |

**レスポンス 200**（artist_name を JOIN して返す）

```json
{
  "plans": [
    {
      "id": "uuid",
      "artist_name": "推し A",
      "event_name": "○○ ARENA TOUR 2026",
      "venue_name": "東京ドーム",
      "event_date": "2026-08-15",
      "estimated_cost": 38000,
      "share_token": null,
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

**認証**: 任意（未ログインでも可・IPレート制限あり）

**リクエストボディ**

```json
{
  "artist_id": "uuid（任意・未ログイン時はnull）",
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
| event_name | ✅ | 1〜80文字 |
| venue_hint | ✅ | 1〜80文字 |
| event_date | ✅ | 今日以降 |
| event_time | — | HH:MM形式 |
| departure | ✅ | 1〜50文字（未指定はhome_stationを使用） |
| budget_hint | — | 0以上の整数（円） |

**サーバー側処理フロー**

```
1. レート制限チェック
   - 未ログイン: Vercel KV で IP別 daily カウント（上限3）
   - ログイン済み: Vercel KV で user_id別 daily カウント（上限10）
2. キャッシュ確認（同一会場×出発地の過去プランで交通・ホテル情報を部分流用）
3. Google Maps APIで会場座標・経路・周辺情報を取得
4. 楽天トラベルAPIで会場周辺ホテルを検索（アフィリエイトURL生成）
5. プロンプト構築（Mapsコンテキスト・ホテル情報を注入）
   → Claude API（claude-sonnet-4-6）に送信
6. plan_jsonスキーマでZodバリデーション（失敗時は最大2回リトライ）
7. plansテーブルに INSERT
8. レート制限カウントをインクリメント
9. 生成プランを返却
```

**レスポンス 201**

```json
{
  "id": "uuid",
  "event_name": "○○ ARENA TOUR 2026",
  "venue_name": "東京ドーム",
  "event_date": "2026-08-15",
  "plan_json": {
    "summary": "東京ドーム公演 1泊2日プラン",
    "estimated_cost": 38000,
    "itinerary": [
      { "time": "07:30", "action": "新幹線のぞみ乗車（名古屋→東京）", "cost": 11000 },
      { "time": "10:30", "action": "ホテル荷物預け" },
      { "time": "13:00", "action": "物販列に並ぶ（推奨開始時刻）" },
      { "time": "18:00", "action": "開演" }
    ],
    "accommodation": {
      "name": "東京ドーム周辺エリア",
      "area": "後楽園・水道橋",
      "price_approx": 8000,
      "affiliate_links": {
        "rakuten": "https://travel.rakuten.co.jp/...?af=oshiplan&area=tokyo-dome",
        "jalan": "https://www.jalan.net/...?afid=oshiplan"
      }
    },
    "transit": {
      "outbound": {
        "type": "shinkansen",
        "name": "のぞみ（名古屋→東京）",
        "cost": 11000,
        "duration_min": 100,
        "booking_url": "https://www.eki-net.com/top/train/..."
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
    "goods_links": [],
    "tips": ["コインロッカーは東京ドームシティ内に多数あり"]
  },
  "share_token": null,
  "created_at": "2026-05-17T10:00:00Z"
}
```

**エラーケース**

| コード | 状況 |
|--------|------|
| `429 RATE_LIMIT_EXCEEDED` | 1日の生成上限超過（未ログイン3回 / ログイン10回） |
| `503 AI_UNAVAILABLE` | Claude API タイムアウト（カウントしない） |
| `400 VALIDATION_ERROR` | バリデーション失敗 |

---

### 4.3 GET `/api/plans/:id`

**レスポンス 200**: 4.2と同形式（plan_json全体を返す）

---

### 4.4 PATCH `/api/plans/:id`

plan_json を手動更新（Zodバリデーション必須）。**レスポンス 200**。

---

### 4.5 DELETE `/api/plans/:id`

plan_records も CASCADE 削除。**レスポンス 204**。

---

### 4.6 POST `/api/plans/:id/share` — 共有トークン発行

> **変更点**: 旧仕様ではPremiumユーザーのみだったが、**全ユーザー無料で利用可能**に変更。

**レスポンス 200**

```json
{
  "share_token": "abc123xyz...",
  "share_url": "https://oshiplan.app/shared/abc123xyz"
}
```

---

### 4.7 DELETE `/api/plans/:id/share`

share_token を削除（null に更新）。**レスポンス 204**。

---

## 5. 共有プラン（認証不要）

### 5.1 GET `/api/shared/:token`

**レスポンス 200**（user_id / artist_id などを除いたレスポンス）

```json
{
  "event_name": "○○ ARENA TOUR 2026",
  "venue_name": "東京ドーム",
  "event_date": "2026-08-15",
  "plan_json": {
    "accommodation": {
      "affiliate_links": {
        "rakuten": "https://...",
        "jalan": "https://..."
      }
    }
  },
  "shared_at": "2026-05-17T10:00:00Z"
}
```

> アフィリエイトリンクは共有ページでも表示する（収益機会を維持）。

---

## 6. アフィリエイト（新規）

### 6.1 POST `/api/affiliate/click` — クリック計測

**説明**: アフィリエイトリンクのクリックを記録する。ユーザーのリダイレクト前にフロントエンドから呼び出す。

**認証**: 不要

**リクエストボディ**

```json
{
  "plan_id": "uuid（任意）",
  "affiliate_type": "hotel",
  "affiliate_partner": "rakuten",
  "destination_url": "https://travel.rakuten.co.jp/..."
}
```

| フィールド | 必須 | 値 |
|-----------|------|---|
| plan_id | — | クリック元のプランID |
| affiliate_type | ✅ | `hotel` / `transit` / `goods` |
| affiliate_partner | ✅ | `rakuten` / `jalan` / `amazon` / `eki-net` 等 |
| destination_url | ✅ | リダイレクト先URL |

**レスポンス 200**

```json
{
  "redirect_url": "https://travel.rakuten.co.jp/..."
}
```

**不正クリック防止**: 同一IPアドレス×同一destination_urlは1時間に1カウントのみ記録（Vercel KV で管理）。

---

## 7. 会場（Venues）

### 7.1 GET `/api/venues` — 会場一覧取得

SSG（Next.js の `generateStaticParams`）から呼び出し、全会場ページを静的生成する。

**レスポンス 200**

```json
{
  "venues": [
    { "id": "uuid", "slug": "tokyo-dome", "name": "東京ドーム", "prefecture": "東京都" },
    { "id": "uuid", "slug": "k-arena-yokohama", "name": "Kアリーナ横浜", "prefecture": "神奈川県" }
  ]
}
```

---

### 7.2 GET `/api/venues/:slug` — 会場詳細＋周辺ホテル

会場別LPのSSGおよびユーザーリクエスト時に呼び出す。

**レスポンス 200**

```json
{
  "id": "uuid",
  "slug": "tokyo-dome",
  "name": "東京ドーム",
  "prefecture": "東京都",
  "address": "東京都文京区後楽1-3-61",
  "lat": 35.7057,
  "lng": 139.7518,
  "capacity": 55000,
  "nearby_hotels": [
    {
      "name": "東京ドームホテル",
      "rating": 4.2,
      "price_from": 12000,
      "distance_m": 200,
      "affiliate_links": {
        "rakuten": "https://travel.rakuten.co.jp/...?af=oshiplan",
        "jalan": "https://www.jalan.net/...?afid=oshiplan"
      }
    },
    {
      "name": "水道橋グランドホテル",
      "rating": 3.9,
      "price_from": 8000,
      "distance_m": 350,
      "affiliate_links": {
        "rakuten": "https://...",
        "jalan": "https://..."
      }
    }
  ],
  "tips": [
    "コインロッカーは東京ドームシティ内に多数あり",
    "最寄り駅はJR水道橋駅・都営三田線水道橋駅・東京メトロ後楽園駅"
  ]
}
```

**実装**: 楽天トラベルAPIで `rakuten_area_code` を使って周辺ホテルを検索し、アフィリエイトURLを付与して返す。ISR（revalidate: 3600）でキャッシュする。

---

## 8. スキーマ定義

### 8.1 plan_json スキーマ（Zod）

```typescript
const ItineraryItem = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  action: z.string().min(1).max(200),
  cost: z.number().int().nonnegative().nullable(),
});

const AffiliateLinks = z.object({
  rakuten: z.string().url().nullable(),
  jalan: z.string().url().nullable(),
}).partial();

const Accommodation = z.object({
  name: z.string().min(1).max(100),
  area: z.string().max(50).nullable(),
  price_approx: z.number().int().nonnegative().nullable(),
  affiliate_links: AffiliateLinks.nullable(),
});

const TransitInfo = z.object({
  type: z.enum(["shinkansen", "airplane", "bus", "local", "other"]),
  name: z.string(),
  cost: z.number().int().nonnegative(),
  duration_min: z.number().int().positive(),
  booking_url: z.string().url().nullable(),
});

const GoodsLink = z.object({
  name: z.string().max(100),
  amazon_url: z.string().url().nullable(),
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
  goods_links: z.array(GoodsLink).max(5),
  tips: z.array(z.string().max(200)).max(10),
});
```

### 8.2 affiliate_type の値

| 値 | 説明 |
|----|------|
| `hotel` | 宿泊予約（楽天トラベル・じゃらん） |
| `transit` | 交通予約（えきねっと・高速バス等） |
| `goods` | グッズ購入（Amazon・楽天） |

---

## 9. LLMプロンプト設計

### 9.1 システムプロンプト

```
あなたは推し活遠征に精通した日本の旅行プランナーです。
ユーザーが入力した公演情報をもとに、最適な遠征プランをJSON形式で作成してください。

【ルール】
- 違法行為（転売・不法侵入・個人宅の特定等）を助長する内容は含めないこと
- 宿泊・交通の価格は概算であることを明記すること
- accommodation の affiliate_links フィールドには必ず null を設定すること
  （アフィリエイトURLはサーバー側で別途付与する）
- 回答は必ず指定のJSONスキーマに従うこと
```

### 9.2 ユーザープロンプト（動的生成）

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

【宿泊エリア参考（楽天トラベルで後から付与するため名称のみ記載）】
{{hotel_area_hint}}

【出力形式】
以下のJSONスキーマに厳密に従って出力してください:
{{plan_json_schema}}
```

---

## 10. 実装メモ

### レート制限（Vercel KV）

```typescript
// 未ログインユーザー
const key = `ai_rate:${ip}:${today}`
const count = await kv.incr(key)
await kv.expire(key, 86400) // 1日でリセット
if (count > 3) throw new RateLimitError()

// ログインユーザー
const key = `ai_rate:${userId}:${today}`
const count = await kv.incr(key)
await kv.expire(key, 86400)
if (count > 10) throw new RateLimitError()
```

### アフィリエイトURL生成（楽天トラベル）

```typescript
function buildRakutenAffiliateUrl(areaCode: string, checkIn: string): string {
  return `https://travel.rakuten.co.jp/keyword/?f_area=${areaCode}&f_checkin=${checkIn}&af=oshiplan`
}
```

### キャッシュ戦略

同一の `venue_name` × `departure` の組み合わせで過去7日以内に生成されたプランがある場合、`transit` の基礎情報（所要時間・費用）をテンプレートとして再利用し、Claude API のトークン数を削減する。

---

## 11. cURL サンプル集

### プラン生成（未ログイン）

```bash
curl -X POST https://oshiplan.app/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "○○ ARENA TOUR 2026",
    "venue_hint": "東京ドーム",
    "event_date": "2026-08-15",
    "departure": "名古屋駅",
    "options": { "stay_overnight": true, "merch": true, "pilgrimage": false }
  }'
```

### アフィリエイトクリック計測

```bash
curl -X POST https://oshiplan.app/api/affiliate/click \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "uuid",
    "affiliate_type": "hotel",
    "affiliate_partner": "rakuten",
    "destination_url": "https://travel.rakuten.co.jp/..."
  }'
```

### 会場詳細取得

```bash
curl https://oshiplan.app/api/venues/tokyo-dome
```

### 共有プラン閲覧（認証不要）

```bash
curl https://oshiplan.app/api/shared/abc123xyz
```
