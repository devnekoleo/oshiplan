# Viamaps API 仕様書

2026年5月 / **Version 3.0（フルリビルド版）**

---

## 1. 概要

本書は Viamaps v3.0 が利用・提供する API の仕様を定義する。

| 区分 | 提供 |
|------|------|
| 1. 外部 API | Google Maps Platform / Supabase / Sentry |
| 2. 内部 API | Next.js Route Handler `/api/*` |
| 3. Server Actions | Next.js Server Actions（フォーム送信用） |
| 4. Supabase RPC | Postgres ストアド関数 |
| 5. Public Embed API | `/api/embed/[mapId]` 軽量公開エンドポイント |

---

## 2. 外部 API 利用

### 2.1 Google Maps JavaScript API

**読込**：クライアント側で `@vis.gl/react-google-maps` 経由でロード。

```ts
<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
  <Map mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID!} ... />
</APIProvider>
```

**ライブラリ**：`places`, `geometry`, `drawing`, `marker`（Advanced Markers）

**制限**：HTTP リファラ制限（`*.viamaps.app/*`, `localhost:*`）

### 2.2 Google Places API (New)

#### 2.2.1 Autocomplete (クライアント直叩き不可、サーバー経由)

| 項目 | 値 |
|------|---|
| エンドポイント | `POST https://places.googleapis.com/v1/places:autocomplete` |
| 認証 | サーバーキー（X-Goog-Api-Key ヘッダ） |
| 入力 | `{ input, languageCode: "ja", regionCode: "JP", locationBias: {...} }` |
| 出力 | `{ suggestions: [{ placePrediction: { placeId, text } }] }` |

#### 2.2.2 Place Details

| 項目 | 値 |
|------|---|
| エンドポイント | `GET https://places.googleapis.com/v1/places/{placeId}` |
| 認証 | サーバーキー |
| FieldMask（必須） | `id,displayName,location,formattedAddress,photos,rating,userRatingCount,websiteUri,internationalPhoneNumber,regularOpeningHours,types` |
| 出力 | Place オブジェクト |

### 2.3 Google Directions API

| 項目 | 値 |
|------|---|
| エンドポイント | `POST https://routes.googleapis.com/directions/v2:computeRoutes` |
| 認証 | サーバーキー |
| 入力 | `{ origin, destination, intermediates[], travelMode, computeAlternativeRoutes: false }` |
| FieldMask | `routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters` |
| キャッシュ | 同一リクエストは Supabase `route_cache` テーブルに 24h キャッシュ |

### 2.4 Supabase

- **Auth**：`@supabase/ssr` でクッキーベース SSR 対応
- **DB**：RLS 適用 PostgREST
- **Realtime**：`maps`, `points`, `map_days` テーブルを購読（共同編集）
- **Storage**：`map-covers/` `point-images/` バケット

---

## 3. 内部 API（Route Handler）

すべて `/api/*` 配下に配置。レスポンスは JSON。エラーは `{ error: { code, message } }` 形式。

### 3.1 認証関連

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/auth/signup` | メールサインアップ |
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/oauth/google` | Google OAuth リダイレクト開始 |
| GET | `/api/auth/oauth/callback` | OAuth コールバック |

### 3.2 Places プロキシ

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/places/autocomplete` | Autocomplete 検索（サーバー経由でキー隠蔽） |
| GET | `/api/places/details?placeId=...` | Place Details 取得（24h キャッシュ） |

**Request Body (autocomplete)**:
```json
{ "input": "東京駅", "lng": 139.7, "lat": 35.6, "radius": 50000 }
```

**Response**:
```json
{
  "suggestions": [
    { "placeId": "ChIJ...", "primaryText": "東京駅", "secondaryText": "東京都千代田区..." }
  ]
}
```

### 3.3 Directions プロキシ

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/directions` | ルート計算（キャッシュ付き） |

**Request Body**:
```json
{
  "waypoints": [
    { "lng": 139.7, "lat": 35.6 },
    { "lng": 139.71, "lat": 35.65 }
  ],
  "travelMode": "DRIVE"
}
```

**Response**:
```json
{
  "encodedPolyline": "abcd...",
  "distanceMeters": 12500,
  "durationSeconds": 1850,
  "legs": [{ "distanceMeters": 12500, "durationSeconds": 1850 }]
}
```

### 3.4 マップ API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/maps` | 自分のマップ一覧 |
| POST | `/api/maps` | マップ作成 |
| GET | `/api/maps/[id]` | マップ詳細（含む points, days, lines） |
| PATCH | `/api/maps/[id]` | マップ更新 |
| DELETE | `/api/maps/[id]` | マップ削除 |
| POST | `/api/maps/[id]/duplicate` | マップ複製 |

### 3.5 ポイント API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/maps/[id]/points` | ポイント作成 |
| PATCH | `/api/points/[id]` | ポイント更新 |
| DELETE | `/api/points/[id]` | ポイント削除 |
| POST | `/api/points/reorder` | 並び替え（一括 order_index 更新） |

**Point スキーマ**:
```ts
{
  id: string;
  map_id: string;
  day_id: string | null;
  place_id: string | null;        // Google Place ID
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  marker_color: string;            // hex
  category: string | null;
  start_time: string | null;       // HH:MM
  end_time: string | null;
  cost: number | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}
```

### 3.6 日程 API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/maps/[id]/days` | Day 追加 |
| PATCH | `/api/days/[id]` | Day 更新 |
| DELETE | `/api/days/[id]` | Day 削除 |
| POST | `/api/days/reorder` | Day 並び替え |

### 3.7 描画 API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/maps/[id]/lines` | 描画オブジェクト作成 |
| PATCH | `/api/lines/[id]` | 更新 |
| DELETE | `/api/lines/[id]` | 削除 |

### 3.8 チェックリスト API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/maps/[id]/checklist` | リスト取得 |
| POST | `/api/maps/[id]/checklist` | アイテム追加 |
| PATCH | `/api/checklist/[id]` | チェック切替・編集 |
| DELETE | `/api/checklist/[id]` | 削除 |

### 3.9 共同編集 API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/maps/[id]/invites` | 招待リンク作成 |
| GET | `/api/invites/[token]` | 招待情報取得（権限） |
| POST | `/api/invites/[token]/accept` | 招待承諾 |
| GET | `/api/maps/[id]/collaborators` | 共同編集者一覧 |
| DELETE | `/api/collaborators/[id]` | 共同編集者削除 |

### 3.10 公開 Embed API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/embed/[mapId]` | 公開マップの軽量データ（認証不要） |

**Response** (キャッシュ ISR 60s):
```json
{
  "map": { "id", "title", "description", "cover_url" },
  "days": [...],
  "points": [...],
  "lines": [...]
}
```

---

## 4. Server Actions

`'use server'` 関数として実装、フォーム経由で呼出。

| 関数 | 用途 |
|------|------|
| `createMap(formData)` | マップ作成 |
| `updateMap(mapId, formData)` | マップ更新（redirect with revalidate） |
| `deleteMap(mapId)` | マップ削除 |
| `savePoint(formData)` | ポイント保存（下書き → 永続化） |
| `discardDraft()` | 下書き破棄（クライアント側 state リセットのみ） |

---

## 5. Supabase RPC

| 関数 | 引数 | 戻り値 | 用途 |
|------|------|-------|------|
| `reorder_points(p_map_id, p_orders jsonb)` | マップID, [{id, order_index}] | void | ポイント一括並び替え（トランザクション） |
| `reorder_days(p_map_id, p_orders jsonb)` | 同上 | void | Day 一括並び替え |
| `get_map_full(p_map_id uuid)` | マップID | jsonb | マップ + days + points + lines をまとめて返す（N+1 回避） |
| `clone_map(p_source_id uuid)` | 元マップID | uuid (新ID) | マップ複製 |

---

## 6. エラーコード

| code | HTTP | 意味 |
|------|------|------|
| `unauthorized` | 401 | 未認証 |
| `forbidden` | 403 | 権限不足（RLS 違反） |
| `not_found` | 404 | リソース不在 |
| `validation_error` | 400 | 入力検証エラー（detail 付き） |
| `rate_limited` | 429 | レート制限超過 |
| `external_api_error` | 502 | Google API 失敗 |
| `internal_error` | 500 | サーバーエラー |

---

## 7. レート制限

| 対象 | 制限 |
|------|------|
| `/api/places/autocomplete` | 100 req/min/user |
| `/api/directions` | 30 req/min/user |
| `/api/places/details` | 60 req/min/user |
| その他 `/api/*` | 300 req/min/user |

実装：Vercel Edge Config + IP/UID キー。

---

## 8. キャッシュ戦略

| 対象 | キャッシュ | TTL |
|------|----------|----|
| `/api/embed/[mapId]` | ISR | 60s |
| Place Details | Supabase `place_cache` テーブル | 24h |
| Directions 結果 | Supabase `route_cache` | 24h |
| マップ一覧 | RSC fetch revalidate | 30s |

---

## 9. Webhook（将来用）

| イベント | エンドポイント |
|--------|--------------|
| マップ公開 | `POST /api/webhooks/map-published` |
| 共同編集者追加 | `POST /api/webhooks/collaborator-added` |

v3.0 では未実装、v3.2 で導入予定。

---

**Version 履歴**
- v1.0 (2026-04)
- v2.0 (2026-05-22)
- **v3.0 (2026-05-23): Google Maps Platform API へ全面切替、内部 API を REST + Server Actions へ整理**
