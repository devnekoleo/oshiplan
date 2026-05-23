# Viamaps API 仕様書

Google マイマップ × tabiori の機能を持つ旅行地図サービス

2026年5月 / Version 2.0

---

## 0. 概要

Viamaps のデータ操作は主に **Next.js Server Actions** で実装する。REST API Route Handlers は認証コールバックのみ。外部 API（Mapbox Geocoding・Directions）はクライアントサイドから直接呼び出す。

### ベース URL

```
https://viamaps.app   （本番）
http://localhost:3000  （開発）
```

### 実装方針

| 操作 | 実装方法 |
|------|---------|
| データ取得（読み取り） | Server Component 内で直接 Supabase クエリ |
| データ変更（書き込み） | Server Actions（`"use server"` 関数） |
| OAuth コールバック | Route Handler（`/auth/callback`） |
| 場所検索 | Mapbox Geocoding API（クライアント直接、デバウンス 400ms） |
| 道路ルート | Mapbox Directions API（クライアント直接、非同期フェッチ） |

---

## 1. Server Actions

### 1.1 マップ操作（`app/maps/actions.ts`）

#### `createMap(prevState, formData)`

新規マップを作成してエディタにリダイレクト。

```typescript
// formData
{ title: string; description?: string; }
// 成功: redirect('/maps/{id}')
// 失敗: { error: string }
```

#### `updateMap(id, prevState, formData)`

マップのタイトル・説明・公開設定を更新。成功後 `/maps/{id}` にリダイレクト。

```typescript
// formData
{ title: string; description?: string; is_public?: "true"; }
// 成功: redirect('/maps/{id}')
// 失敗: { error: string }
```

#### `deleteMap(id)`

マップと全関連データ（days・points・lines・checklist）を削除して `/maps` にリダイレクト。

---

### 1.2 ポイント操作（`app/maps/[id]/actions.ts`）

#### `createPoint(mapId, data)`

マップにポイントを追加。`order_index` は既存最大値 + 1 が自動設定。

```typescript
data: {
  title: string;
  description: string;
  lat: number;
  lng: number;
  day_id?: string | null;       // 日程割り当て
  start_time?: string | null;   // "HH:MM" 形式
  end_time?: string | null;
  cost?: number;                 // 費用（円）
  category?: string;            // "spot"|"restaurant"|"hotel"|"transport"
  marker_color?: string | null; // "#RRGGBB" or null（日程カラーに従う）
}
// 戻り値: { id?: string; error?: string }
```

#### `updatePoint(mapId, pointId, data)`

ポイントのすべてのフィールドを更新。

```typescript
data: {
  title: string;
  description: string;
  images: PointImage[];         // { url: string; caption: string | null }[]
  day_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  cost?: number;
  category?: string;
  marker_color?: string | null;
}
// 戻り値: { error?: string }
```

#### `deletePoint(mapId, pointId)`

```typescript
// 戻り値: { error?: string }
```

#### `reorderPoints(mapId, orderedIds)`

ポイントの並び順を一括更新。

```typescript
orderedIds: string[] // 新しい順序のポイント ID 配列
// 戻り値: { error?: string }
```

---

### 1.3 日程操作（`app/maps/[id]/actions.ts`）

#### `addDay(mapId)`

新しい日程を追加。`day_number` は既存最大値 + 1 が自動設定。

```typescript
// 戻り値: { id?: string; day_number?: number; error?: string }
```

#### `updateDay(dayId, data)`

日程のタイトル・日付を更新。

```typescript
data: { title?: string; date?: string; } // date: "YYYY-MM-DD"
// 戻り値: { error?: string }
```

#### `deleteDay(dayId, mapId)`

日程を削除。配下のポイントの `day_id` は NULL になる（SET NULL 制約）。

```typescript
// 戻り値: { error?: string }
```

---

### 1.4 描画ライン操作（`app/maps/[id]/actions.ts`）

#### `createLine(mapId, data)`

描画ラインを保存。

```typescript
data: {
  name?: string;
  color: string;                      // "#RRGGBB"
  width: number;                      // デフォルト 3
  coordinates: [number, number][];    // [[lng, lat], ...]
  day_id?: string | null;
}
// 戻り値: { id?: string; error?: string }
```

#### `deleteLine(lineId, mapId)`

```typescript
// 戻り値: { error?: string }
```

---

### 1.5 チェックリスト操作（`app/maps/[id]/actions.ts`）

#### `addChecklistItem(mapId, data)`

```typescript
data: { category: "packing" | "todo"; label: string; }
// 戻り値: { id?: string; error?: string }
```

#### `toggleChecklistItem(itemId, is_checked)`

```typescript
is_checked: boolean
// 戻り値: { error?: string }
```

#### `deleteChecklistItem(itemId)`

```typescript
// 戻り値: { error?: string }
```

---

### 1.6 認証操作（`app/auth/actions.ts`）

#### `signIn(prevState, formData)`

メール・パスワードでログイン。成功時は `redirectTo` または `/maps` にリダイレクト。

```typescript
// formData: { email, password, redirectTo? }
```

#### `signUp(prevState, formData)`

新規アカウント作成。確認メール送信後、成功状態を返す。

```typescript
// 成功: { error: "", success: true }
// 失敗: { error: string }
```

#### `signOut()`

ログアウトし、トップページにリダイレクト。

---

## 2. Route Handlers

### `GET /auth/callback`

OAuth コールバック処理（Google OAuth）。

```
パラメータ: ?code={認可コード}&next={リダイレクト先}

処理:
1. supabase.auth.exchangeCodeForSession(code)
2. 成功: redirect(origin + next)  ※ next デフォルトは /maps
3. 失敗: redirect('/auth/login?error=認証に失敗しました')
```

---

## 3. データ取得（Server Component）

### マイマップ一覧（`/maps`）

```typescript
// ポイント数を含む
const { data: maps } = await supabase
  .from('maps')
  .select('*, points(count)')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false });
```

### マップエディタ（`/maps/[id]`）

```typescript
// 並列取得
const [{ data: points }, { data: days }, { data: lines }] = await Promise.all([
  supabase.from('points').select('*').eq('map_id', id).order('order_index', { ascending: true }),
  supabase.from('map_days').select('*').eq('map_id', id).order('day_number', { ascending: true }),
  supabase.from('map_lines').select('*').eq('map_id', id).order('created_at', { ascending: true }),
]);
```

### ビューアモード・共有マップ

```typescript
// オーナー または 公開マップのみ
const { data: map } = await supabase
  .from('maps').select('*').eq('id', id)
  .or(`user_id.eq.${user.id},is_public.eq.true`).single();

// days・points も取得
```

---

## 4. 外部 API（クライアントサイド）

### Mapbox Geocoding API（場所検索）

```
GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json
  ?access_token={NEXT_PUBLIC_MAPBOX_TOKEN}
  &language=ja
  &limit=5

レスポンス:
{
  features: [{
    id: string;
    place_name: string;
    center: [number, number]; // [lng, lat]
  }]
}
```

デバウンス 400ms。入力クリア or 結果選択でドロップダウンを閉じる。

### Mapbox Directions API（道路ルート）

```
GET https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}
  ?geometries=geojson
  &overview=full
  &access_token={NEXT_PUBLIC_MAPBOX_TOKEN}

座標形式: lng1,lat1;lng2,lat2;...  （最大25ウェイポイント）

レスポンス:
{
  routes: [{
    geometry: { type: "LineString"; coordinates: [number, number][] };
    distance: number; // メートル
    duration: number; // 秒
  }]
}
```

日程内ポイントが変更されるたびに非同期でフェッチ。失敗時は直線フォールバック。

---

## 5. エラーハンドリング

| 戻り値 | 意味 |
|-------|------|
| `null` | 成功（エラーなし） |
| `{ error: string }` | バリデーションまたは DB エラー |
| `redirect(path)` | 成功後リダイレクト（NEXT_REDIRECT throw） |
| `{ id: string }` | 作成成功（ID を返す場合） |
| `{ id, day_number }` | 日程追加成功 |

クライアントは `useActionState` でエラー状態を管理し、フォーム上にエラーメッセージを表示。
