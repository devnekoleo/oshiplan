# Viamaps システム設計書

2026年5月 / **Version 3.0（フルリビルド版）**

---

## 1. 概要

本書は Viamaps v3.0 のシステムアーキテクチャ・データモデル・状態管理設計を定義する。

v3.0 で再設計する3つの中核領域：
1. **状態管理アーキテクチャ**（モード / 下書き / 編集 / ホバー / 選択を分離）
2. **データモデル**（Place ID 統合、共同編集対応）
3. **同期戦略**（楽観更新 + Supabase Realtime + 競合検出）

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌──────────────────────────────────────────────────────────┐
│                       Browser (Client)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ React 19   │  │ Zustand    │  │ Google Maps JS API │  │
│  │ Components │  │ Stores     │  │ + Places + Drawing │  │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────┘  │
│        └────────────────┴────────────────────┘            │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼─────────────────────────────────┐
│                  Vercel Edge / Node                       │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │ Next.js App      │  │ Route Handlers /api/*        │  │
│  │ Router (RSC+SC)  │  │ - Places / Directions Proxy  │  │
│  └────────┬─────────┘  │ - Maps / Points / Days       │  │
│           │            │ - Rate Limit (Edge Config)   │  │
│           │            └──────────┬───────────────────┘  │
└───────────┼───────────────────────┼──────────────────────┘
            │                       │
   ┌────────▼──────────┐  ┌─────────▼────────────────┐
   │  Supabase         │  │  Google Maps Platform     │
   │  - Auth           │  │  - Places API (New)       │
   │  - Postgres + RLS │  │  - Directions API         │
   │  - Realtime       │  │  - Geocoding API          │
   │  - Storage        │  └───────────────────────────┘
   └───────────────────┘
            │
   ┌────────▼──────┐
   │ Sentry        │
   │ (error track) │
   └───────────────┘
```

### 2.2 ディレクトリ構成

```
via/
├── app/
│   ├── (marketing)/             # ランディング・料金・FAQ
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/
│   ├── maps/
│   │   ├── page.tsx             # マップ一覧（RSC）
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx         # エディタ（RSC + ClientShell）
│   │       ├── settings/page.tsx
│   │       └── checklist/page.tsx
│   ├── m/[slug]/page.tsx        # 公開ビューア
│   ├── embed/[id]/page.tsx      # iframe 軽量ビューア
│   └── api/                     # Route Handlers
│       ├── places/
│       ├── directions/
│       ├── maps/
│       └── ...
├── components/
│   ├── maps/
│   │   ├── MapEditor.tsx        # エディタの ClientShell
│   │   ├── MapViewer.tsx
│   │   ├── GoogleMapCanvas.tsx  # @vis.gl/react-google-maps ラッパ
│   │   ├── ModeToggle.tsx       # 👁/📍/✏️/📏
│   │   ├── DraftBanner.tsx      # 「未保存の地点」バナー
│   │   ├── PointSidebar.tsx
│   │   ├── PointPanel.tsx       # スライドオーバー
│   │   ├── DayList.tsx
│   │   ├── DirectionsLayer.tsx
│   │   ├── DrawingLayer.tsx
│   │   └── PlacesAutocomplete.tsx
│   └── ui/                      # shadcn/ui
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── google/
│   │   ├── places.ts            # サーバー側 Places ラッパ
│   │   ├── directions.ts
│   │   └── geocoding.ts
│   ├── stores/                  # Zustand
│   │   ├── editorStore.ts
│   │   ├── draftStore.ts
│   │   └── modeStore.ts
│   ├── api/                     # フロント側 API クライアント
│   └── utils/
├── types/
│   ├── db.ts                    # Supabase 生成型
│   └── domain.ts                # ドメイン型
├── supabase/
│   └── migrations/
└── docs/
```

---

## 3. データモデル

### 3.1 ER 図（概念）

```
auth.users (Supabase Auth)
   │ 1
   │
   * profiles
   │ 1
   │
   * maps ────── 1..* map_collaborators
   │ 1                  │
   │                    └── auth.users
   ├── 1..* map_days
   │     │ 1
   │     │
   │     * points (day_id NULL 可 = 未割当)
   │
   ├── 1..* map_lines (描画)
   ├── 1..* checklist_items
   ├── 1..* map_invites
   └── 1..* map_activity_log
```

### 3.2 テーブル定義

#### `profiles`
| カラム | 型 | 制約 | 説明 |
|------|----|------|------|
| id | uuid | PK, FK auth.users | |
| display_name | text | | |
| avatar_url | text | | |
| created_at | timestamptz | default now() | |

#### `maps`
| カラム | 型 | 制約 | 説明 |
|------|----|------|------|
| id | uuid | PK | |
| owner_id | uuid | FK profiles.id | |
| slug | text | unique | 公開 URL 用 |
| title | text | not null | |
| description | text | | |
| cover_url | text | | |
| is_public | bool | default false | |
| default_travel_mode | text | default 'DRIVE' | |
| created_at / updated_at | timestamptz | | |
| version | int | default 1 | 楽観ロック用 |

#### `map_days`
| カラム | 型 | 制約 | 説明 |
|------|----|------|------|
| id | uuid | PK | |
| map_id | uuid | FK maps.id ON DELETE CASCADE | |
| title | text | | "1日目" など |
| date | date | | |
| color | text | default '#3b82f6' | hex |
| order_index | int | not null | |
| created_at | timestamptz | | |

#### `points`
| カラム | 型 | 制約 | 説明 |
|------|----|------|------|
| id | uuid | PK | |
| map_id | uuid | FK maps.id ON DELETE CASCADE | |
| day_id | uuid | FK map_days.id ON DELETE SET NULL | NULL = 未割当 |
| place_id | text | | Google Place ID（任意） |
| title | text | not null | |
| description | text | | |
| lng / lat | double precision | not null | |
| marker_color | text | default '#3b82f6' | |
| category | text | | "restaurant" "hotel" など |
| start_time / end_time | time | | |
| cost | numeric | | |
| image_url | text | | |
| order_index | int | not null | |
| created_at / updated_at | timestamptz | | |

#### `map_lines`
| カラム | 型 | 説明 |
|------|----|------|
| id | uuid PK | |
| map_id | uuid FK | |
| name | text | |
| coordinates | jsonb | `[[lng, lat], ...]` |
| color | text | hex |
| width | int | px |
| type | text | 'line' \| 'polygon' |

#### `checklist_items`
| カラム | 型 | 説明 |
|------|----|------|
| id | uuid PK | |
| map_id | uuid FK | |
| type | text | 'packing' \| 'todo' |
| content | text | |
| is_done | bool | |
| assignee_id | uuid | nullable, FK profiles |
| order_index | int | |

#### `map_collaborators`
| カラム | 型 | 説明 |
|------|----|------|
| id | uuid PK | |
| map_id | uuid FK | |
| user_id | uuid FK auth.users | |
| role | text | 'viewer' \| 'commenter' \| 'editor' |
| created_at | timestamptz | |
| UNIQUE (map_id, user_id) | | |

#### `map_invites`
| カラム | 型 | 説明 |
|------|----|------|
| id | uuid PK | |
| map_id | uuid FK | |
| token | text unique | URL に埋め込む招待トークン |
| role | text | 付与する権限 |
| expires_at | timestamptz | |
| created_by | uuid | |

#### `place_cache`（Place Details キャッシュ）
| カラム | 型 | 説明 |
|------|----|------|
| place_id | text PK | |
| payload | jsonb | Places Details レスポンス |
| fetched_at | timestamptz | |

#### `route_cache`（Directions キャッシュ）
| カラム | 型 | 説明 |
|------|----|------|
| key | text PK | sha256(waypoints + mode) |
| payload | jsonb | |
| fetched_at | timestamptz | |

#### `map_activity_log`
| カラム | 型 | 説明 |
|------|----|------|
| id | uuid PK | |
| map_id | uuid FK | |
| actor_id | uuid | |
| action | text | 'point.create' 'point.update' ... |
| target_id | uuid | |
| diff | jsonb | |
| created_at | timestamptz | |

### 3.3 RLS ポリシー

すべてのテーブルに以下の方針で RLS を設定：

```sql
-- maps: 所有者または共同編集者（権限に応じ）のみ
CREATE POLICY "maps_select" ON maps FOR SELECT USING (
  is_public = true
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM map_collaborators WHERE map_id = id AND user_id = auth.uid())
);

CREATE POLICY "maps_update" ON maps FOR UPDATE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM map_collaborators WHERE map_id = id AND user_id = auth.uid() AND role = 'editor')
);
```

points / map_days / map_lines / checklist_items は `maps` への参照経由で同じ判定。

---

## 4. クライアント状態管理（v3.0 の肝）

### 4.1 状態の分離原則

v2.0 では「pending pin・編集中・選択中・ホバー中」がコンポーネントローカル state でぐちゃっと管理されていた。v3.0 では **5 つの独立した Zustand store** に分離する。

| Store | 責務 | 状態 |
|-------|------|------|
| `modeStore` | 操作モード | `mode: 'view' \| 'add' \| 'draw' \| 'measure'` |
| `draftStore` | 下書きピン | `draft: { lng, lat, placeId? } \| null` |
| `editorStore` | 編集中ポイント | `editingPointId: string \| null` |
| `selectionStore` | 選択/ハイライト | `selectedPointId, hoveredPointId, focusedDayId` |
| `mapStore` | 地図表示 | `center, zoom, style, bounds` |

### 4.2 状態と UI の対応

| 状態 | 影響する UI |
|------|----------|
| `mode === 'add'` | カーソル=crosshair、地図クリックで draft 作成 |
| `mode === 'view'` | 地図クリックは点選択のみ、draft 作成しない |
| `draft !== null` | 上部 DraftBanner 表示、緑ピン点滅 |
| `editingPointId` | PointPanel スライドオーバー表示 |
| `selectedPointId` | マーカー強調 + サイドバー該当行ハイライト |

### 4.3 重要：相互ロックなし

```ts
// v2.0 ❌
if (editingPointId) {
  // 地図クリックを無視
  return;
}

// v3.0 ✅
onMapClick(latlng) {
  if (mode === 'add') {
    draftStore.setDraft({ ...latlng });   // editingPointId とは独立
  } else {
    // 地点選択など別動作
  }
}
```

### 4.4 楽観更新パターン

```ts
// ポイント更新の例
async function updatePoint(id, patch) {
  const prev = editorStore.points.find(p => p.id === id);
  editorStore.applyLocal(id, patch);            // 即時 UI 反映
  try {
    const saved = await api.patchPoint(id, patch);
    editorStore.replace(id, saved);
  } catch (e) {
    editorStore.applyLocal(id, prev);           // ロールバック
    toast.error('保存に失敗しました', { action: 'retry' });
  }
}
```

### 4.5 競合検出（共同編集）

- 各リクエストに `If-Match: <version>` ヘッダ送信
- サーバーは `version` 不一致なら 409 を返す
- クライアントは 409 で「他のユーザーが先に保存しました。再読込しますか？」モーダル

---

## 5. リアルタイム同期

### 5.1 Supabase Realtime

```ts
const channel = supabase
  .channel(`map:${mapId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'points', filter: `map_id=eq.${mapId}` },
    payload => editorStore.applyRemote(payload))
  .on('postgres_changes', { event: '*', table: 'map_days', filter: `map_id=eq.${mapId}` },
    payload => editorStore.applyRemote(payload))
  .subscribe();
```

### 5.2 自分の更新の echo 抑制

- 各楽観更新時に `clientEventId` を生成して送信
- Realtime 受信時、自分の `clientEventId` なら無視

---

## 6. Google Maps Platform 統合

### 6.1 ライブラリ選定

| 候補 | 採用 | 理由 |
|------|------|------|
| `@react-google-maps/api` | ✗ | メンテ停滞気味 |
| **`@vis.gl/react-google-maps`** | **✓** | Google 公式、React 19 対応 |
| `@googlemaps/js-api-loader` | △ | 直接利用は冗長 |

### 6.2 Advanced Markers

```tsx
<AdvancedMarker position={{ lat, lng }} onClick={...}>
  <Pin background={point.marker_color} glyphColor="#fff" borderColor="#fff" />
</AdvancedMarker>
```

Advanced Markers 利用には **Cloud Map ID** が必須。Map Style は Cloud Console で管理。

### 6.3 Polyline（Directions ルート表示）

```tsx
<Polyline
  encodedPath={route.encodedPolyline}
  strokeColor={day.color}
  strokeWeight={4}
  strokeOpacity={0.85}
/>
```

### 6.4 Drawing Manager（描画モード）

`google.maps.drawing.DrawingManager` を `mode === 'draw'` 時のみマウント。

---

## 7. ルーティング設計

| パス | 認証 | レンダリング |
|------|------|----------|
| `/` | 不要 | Static（マーケ） |
| `/auth/*` | 不要 | SSR |
| `/maps` | 必須 | RSC（fetch with cookie） |
| `/maps/[id]` | 必須 | RSC + ClientShell |
| `/maps/[id]/settings` | 必須 | RSC |
| `/maps/[id]/checklist` | 必須 | RSC |
| `/m/[slug]` | 不要 | RSC + ISR 60s |
| `/embed/[id]` | 不要 | RSC + ISR 60s（最小 JS） |

---

## 8. パフォーマンス設計

### 8.1 マーカー大量描画

- 100 個以下：通常 Advanced Markers
- 100-500 個：Marker Clustering (`@googlemaps/markerclusterer`)
- 500 個超：仮想化サイドバー + ビューポート内のみ描画

### 8.2 バンドル最適化

- 地図 / 描画関連は `next/dynamic` で遅延ロード（マーケページ含まれない）
- Tailwind v4 + Lightning CSS で CSS 最小化

### 8.3 画像最適化

- `next/image` 利用
- Supabase Storage は WebP 自動変換 ON

---

## 9. 監視・ログ

### 9.1 Sentry

- クライアント・サーバー両方で初期化済み
- リリースタグ＝Vercel deployment SHA
- パフォーマンストレース ON（サンプリング 10%）

### 9.2 ログ

- Vercel Functions Log を Datadog に転送（Phase 2）
- API レスポンスタイムを `/api/_metrics` に集約

---

## 10. デプロイ・CI/CD

| 環境 | URL | デプロイトリガ |
|------|-----|--------------|
| Production | https://viamaps.app | main ブランチ push |
| Preview | `*-viamaps.vercel.app` | PR 作成・更新 |
| Local | http://localhost:3000 | `npm run dev` |

CI: Vercel + GitHub Actions
- `pnpm typecheck`
- `pnpm test` (Vitest)
- `pnpm test:e2e` (Playwright, PR only)
- `pnpm lint`

---

**Version 履歴**
- v1.0 (2026-04)
- v2.0 (2026-05-22)
- **v3.0 (2026-05-23): Google Maps Platform 統合、Zustand 5 ストア分離、楽観更新+競合検出、共同編集対応**
