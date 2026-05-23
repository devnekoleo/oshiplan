# Viamaps システム設計書

Google マイマップ × tabiori の機能を持つ旅行地図サービス

2026年5月 / Version 2.0

---

## 1. システム概要

Viamaps は、Mapbox GL JS を使った地図上でユーザーがポイントを日程ごとに作成・管理し、Mapbox Directions API による実際の道路ルートを表示しながら「← →」によるスムーズなポイント間ナビゲーションを提供する旅行地図 Web サービス。

### 1.1 設計方針

- 個人開発として最小コスト・最小運用負荷で立ち上げる
- **モバイルファースト**：現地での閲覧を想定したスマホ最適化
- **サーバーレス**：Vercel + Supabase でインフラ管理をゼロに
- Server Actions を主なデータ変更手段とし、API Routes は最小限
- クライアントサイドは Mapbox GL JS（react-map-gl 経由）のみ重い依存を持つ

---

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌──────────────────────────────────────────────────┐
│          Browser (PC / Smartphone)               │
│          Next.js App Router (React 19)           │
│          Tailwind CSS / Mapbox GL JS             │
└───────────────────┬──────────────────────────────┘
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────────────┐
│          Vercel（Next.js ホスティング）           │
│          Server Components（SSR）                │
│          Server Actions（データ変更）            │
└─────────────┬────────────────────────────────────┘
              ▼
┌─────────────────────────┐
│   Supabase              │
│   PostgreSQL + Auth     │
│   Row Level Security    │
└─────────────────────────┘
```

### 2.2 地図・外部 API 処理

```
Browser ←── Mapbox Tile Server（地図タイル）
Browser ←── Mapbox Geocoding API（場所検索）
Browser ←── Mapbox Directions API（道路ルート取得）
Browser ←── Supabase（マップ・日程・ポイントデータ）
Browser：flyTo アニメーション処理（ローカル）
```

Directions API は MapEditor がマウント後・ポイント変更時に非同期で各日程ごとにフェッチする。失敗時は直線フォールバック。

---

## 3. ディレクトリ構成

```
via/
├── app/
│   ├── page.tsx                   # ランディングページ
│   ├── layout.tsx                 # ルートレイアウト
│   ├── globals.css                # グローバルスタイル
│   ├── auth/
│   │   ├── login/page.tsx         # メール/パスワード + Google OAuth
│   │   ├── register/page.tsx      # Google OAuth 優先 + メール登録
│   │   ├── reset-password/page.tsx
│   │   ├── callback/route.ts      # OAuth コールバック
│   │   └── actions.ts             # signIn / signUp / signOut
│   ├── maps/
│   │   ├── page.tsx               # マイマップ一覧（カードグリッド）
│   │   ├── actions.ts             # createMap / updateMap / deleteMap
│   │   ├── new/page.tsx           # マップ作成フォーム
│   │   └── [id]/
│   │       ├── page.tsx           # マップエディタ（days・lines も取得）
│   │       ├── view/page.tsx      # ビューアモード（days 取得）
│   │       ├── settings/
│   │       │   ├── page.tsx       # 設定（Server Component、DB から初期値取得）
│   │       │   └── MapSettingsForm.tsx # 設定フォーム（Client Component）
│   │       ├── checklist/
│   │       │   └── page.tsx       # チェックリスト
│   │       └── actions.ts         # ポイント・日程・ライン・チェックリスト操作
│   ├── shared/[token]/page.tsx    # 公開共有マップ（days 取得）
│   ├── settings/page.tsx          # アカウント設定
│   ├── privacy/page.tsx
│   └── terms/page.tsx
│
├── components/
│   ├── maps/
│   │   ├── MapEditor.tsx          # メインエディタ（Client Component）
│   │   │                          # 場所検索・日程管理・描画ツール・
│   │   │                          # Directions API・ポップアップ含む
│   │   ├── MapViewer.tsx          # ビューアモード（Client Component）
│   │   │                          # デスクトップ左パネル + 右地図
│   │   ├── PointPanel.tsx         # ポイント追加・編集パネル（Client Component）
│   │   │                          # カテゴリ・時刻・費用・カラーピッカー含む
│   │   ├── PointList.tsx          # ポイント一覧（旧、現在は MapEditor 内に統合）
│   │   └── ChecklistEditor.tsx    # チェックリスト編集（Client Component）
│   ├── layout/
│   │   ├── Header.tsx             # ヘッダー（Server Component）
│   │   └── MobileMenuButton.tsx   # モバイルメニュー（Client Component）
│   ├── auth/
│   │   └── SignOutButton.tsx      # ログアウトボタン（Client Component）
│   └── ui/
│       ├── Button.tsx             # プライマリ blue-600
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── EmptyState.tsx
│       └── SkeletonLoader.tsx
│
├── lib/
│   ├── auth.ts                    # getCurrentUser ヘルパー
│   ├── utils.ts                   # cn() ユーティリティ
│   └── supabase/
│       ├── client.ts              # クライアントサイド Supabase
│       ├── server.ts              # サーバーサイド Supabase（cookie 読み書き）
│       └── middleware.ts          # 認証ミドルウェア（/maps, /settings を保護）
│
├── types/index.ts                 # 型定義・DAY_COLORS・getDayColor・getCategoryIcon
├── middleware.ts                  # Next.js ミドルウェア
└── supabase/migrations/
    ├── 20260517000001_initial_schema.sql   # maps, points テーブル
    ├── 20260517000002_rls_policies.sql     # RLS ポリシー
    ├── 20260519000003_increment_rpc.sql    # order_index RPC
    ├── 20260521000004_mappin_schema.sql    # マップピン関連
    ├── 20260523000005_days_and_checklist.sql # map_days・checklist_items・points 拡張
    └── 20260523000006_google_mymaps_features.sql # map_lines・marker_color
```

---

## 4. データフロー

### 4.1 マップ作成フロー

```
1. /maps/new ページ（Server Component）をレンダリング
2. ユーザーがタイトル・説明を入力して送信
3. createMap Server Action が呼ばれる
   ├── supabase.auth.getUser() で認証確認
   ├── supabase.from('maps').insert() でDB挿入
   └── redirect('/maps/{新しいID}') でエディタへ
4. /maps/[id] ページ（Server Component）が maps・points・map_days・map_lines を取得
5. MapEditor（Client Component）に渡してレンダリング
```

### 4.2 ポイント追加フロー

```
1. MapEditor 上で地図をクリック または 場所検索から選択
2. 緑ピン表示 + PointPanel が開く
3. ユーザーがタイトル・カテゴリ・日程・時刻・費用・カラーを入力して「追加する」
4. createPoint Server Action が呼ばれる
   ├── 現在の最大 order_index を取得
   └── supabase.from('points').insert() でDB挿入（day_id・start_time・end_time・cost・marker_color・category 含む）
5. 楽観的更新：クライアントの points state に追加
6. Directions API を再フェッチ（該当日程のルートを更新）
```

### 4.3 Mapbox Directions API フロー

```
MapEditor マウント後 or pointsByDay 変化を検知
→ 各日程（map_day）ごとに処理
  ├── 日程内のポイントが 2つ未満 → ルートデータをクリア（直線フォールバック）
  └── 2つ以上 →
      GET https://api.mapbox.com/directions/v5/mapbox/driving/
          {lng1,lat1;lng2,lat2;...}
          ?geometries=geojson&overview=full&access_token={token}
      ├── 成功 → routeDataByDay[day.id] に geometry・distance・duration を保存
      │         → Mapbox Source/Layer で実際の道路ルートを描画
      │         → Day ヘッダーに距離・所要時間を表示
      └── 失敗 → null のまま → 破線の直線フォールバックで描画
```

### 4.4 描画ライン保存フロー

```
1. 「✏️ ライン」ボタンで drawMode ON
2. ユーザーが地図をクリックするたびに drawingCoords に [lng, lat] を追加
3. 描画中のラインを Mapbox Source/Layer でリアルタイムプレビュー
4. 「完了」ボタン または ダブルクリックで確定
5. createLine Server Action が呼ばれる
   └── supabase.from('map_lines').insert() でDB挿入
6. lines state に追加 → 地図上に永続描画
```

### 4.5 ビューアナビゲーションフロー

```
1. /maps/[id]/view ページがサーバーでポイント・日程を取得
2. MapViewer（Client Component）に渡す
3. デスクトップ：左パネルに日程グループ別ポイント一覧 + 右地図
4. Mapbox 地図がロード完了 → 最初のポイントに flyTo
5. ユーザーが「→」を押す
   ├── currentIndex を +1
   ├── desktopMapRef / mobileMapRef 両方に flyTo を発行
   └── 左パネルの選択・ポイント詳細を切り替え
```

---

## 5. 認証フロー

### 5.1 保護パス

`lib/supabase/middleware.ts` で定義：

```typescript
const PROTECTED_PATHS = ["/maps", "/settings"];
```

未認証ユーザーは `/auth/login?redirectTo=元のパス` にリダイレクト。

### 5.2 Google OAuth フロー

```
1. ログイン/登録ページの「Google でログイン」ボタンをクリック
2. supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback?next=/maps' })
3. Google OAuth ページに遷移
4. 認証後、/auth/callback?code=xxx&next=/maps に戻る
5. exchangeCodeForSession(code) でセッション確立・Cookie セット
6. redirect('/maps') でマイマップへ
```

---

## 6. Supabase 設計

### 6.1 テーブル

| テーブル | 主な用途 |
|---------|---------|
| `auth.users` | Supabase Auth が管理する認証ユーザー |
| `public.maps` | ユーザーが作成したマップ |
| `public.map_days` | マップの日程（Day 1・Day 2…） |
| `public.points` | マップ上のポイント（日程・時刻・費用・カテゴリ・カラー含む） |
| `public.map_lines` | ユーザーが描画したライン |
| `public.checklist_items` | チェックリスト項目（持ち物・やること） |

### 6.2 points テーブルのカラム（拡張後）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| map_id | UUID | FK → maps |
| day_id | UUID | FK → map_days（NULL = 日程なし） |
| title | TEXT | ポイント名 |
| description | TEXT | 説明 |
| lat / lng | FLOAT8 | 座標 |
| order_index | INT | 表示順 |
| start_time | TIME | 開始時刻 |
| end_time | TIME | 終了時刻 |
| cost | INT | 費用（円） |
| category | TEXT | spot / restaurant / hotel / transport |
| marker_color | TEXT | カスタムマーカー色（NULL = 日程カラーに従う） |
| images | JSONB | PointImage[] |
| created_at | TIMESTAMPTZ | — |

### 6.3 トリガー

- `maps` の `updated_at` を更新するトリガー（`update_updated_at` 関数）

### 6.4 インデックス

```sql
idx_maps_user_id         -- マイマップ一覧の高速化
idx_maps_share_token     -- 共有リンクアクセスの高速化
idx_points_map_id        -- マップのポイント取得の高速化
idx_points_order         -- 並び順取得の高速化
idx_map_days_map_id      -- 日程取得の高速化
idx_map_lines_map_id     -- ライン取得の高速化
idx_checklist_map_id     -- チェックリスト取得の高速化
```

---

## 7. 型定義（types/index.ts）

```typescript
export interface TravelMap { id, user_id, title, description, is_public, share_token, created_at, updated_at }

export interface MapDay {
  id: string; map_id: string; day_number: number;
  date: string | null; title: string | null; created_at: string;
}

export interface MapPoint {
  id, map_id, title, description, lat, lng, order_index, images, created_at,
  day_id: string | null;
  start_time: string | null;
  end_time: string | null;
  cost: number;
  marker_color: string | null;
}

export interface MapLine {
  id, map_id, day_id, name, color, width,
  coordinates: [number, number][]; // [lng, lat][]
  created_at: string;
}

export interface ChecklistItem {
  id, map_id, label, is_checked, order_index, created_at,
  category: 'packing' | 'todo';
}

export const DAY_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899'];
export function getDayColor(dayNumber: number): string { return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]; }
export function getCategoryIcon(category: string): string { /* spot/restaurant/hotel/transport */ }
```

---

## 8. 外部依存サービス

| サービス | 用途 | 無料枠 |
|---------|------|-------|
| Supabase | DB + Auth | 500MB DB、50,000 MAU まで |
| Vercel | ホスティング | Hobby プランで個人利用は十分 |
| Mapbox | 地図タイル・Geocoding・Directions API | 月 50,000 マップロードまで無料 |
| Sentry | エラー監視 | 5,000 イベント/月まで無料 |

---

## 9. 運用コスト試算（月次）

| 項目 | MAU 1,000 | MAU 10,000 | 備考 |
|------|-----------|------------|------|
| Supabase | ¥0 | ¥3,500 | Free → Pro |
| Vercel | ¥0 | ¥0 | Hobby 枠内 |
| Mapbox | ¥0 | ¥0〜 | 月 50,000 ロードまで無料 |
| ドメイン | ¥100 | ¥100 | — |
| **合計** | **¥100** | **¥3,600〜** | |
