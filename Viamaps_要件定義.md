# Viamaps 要件定義書

2026年5月 / **Version 3.0（フルリビルド版）**

---

## 1. 概要

本書は Viamaps（旅行地図 Web サービス）の **v3.0 フルリビルド** における機能要件・非機能要件・制約条件を定義する。

v3.0 では以下を最重点で改定する：
1. 地図プロバイダを **Mapbox → Google Maps Platform** へ全面切替
2. UX を **ノンモーダル操作モデル** に再設計
3. **モード明示** UI と **下書きライフサイクル** を導入
4. 共同編集機能を新規追加

---

## 2. システム構成

### 2.1 技術スタック

| レイヤ | 採用技術 | 備考 |
|--------|--------|------|
| フレームワーク | Next.js 15 (App Router) | RSC + Server Actions |
| UI | React 19 + Tailwind CSS v4 | shadcn/ui ベース |
| 言語 | TypeScript 5.x | strict |
| 地図 | **Google Maps JavaScript API** | `@vis.gl/react-google-maps` |
| Places | **Google Places API (New)** | Autocomplete + Details |
| ルート | **Google Directions API** | サーバーサイド呼出 |
| 認証 | Supabase Auth | Email + Google OAuth |
| DB | Supabase Postgres + RLS | リアルタイム購読 |
| ストレージ | Supabase Storage | 画像 (最大 10MB) |
| エラー監視 | Sentry | クライアント・サーバー両対応 |
| テスト | Vitest + Playwright | カバレッジ 70%+ |
| デプロイ | Vercel | ISR + Edge Functions |

### 2.2 環境変数

```
# Google Maps Platform
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=          # クライアント用（HTTPリファラ制限）
GOOGLE_MAPS_SERVER_API_KEY=               # サーバー用（IP制限・Directions/Places Details）
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=           # Cloud Map ID（Advanced Markers 必須）

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OAuth
NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT=

# その他
NEXT_PUBLIC_APP_URL=
SENTRY_DSN=
```

---

## 3. 機能要件

### 3.1 認証・ユーザー管理 (F-AUTH)

| ID | 要件 | 優先度 |
|----|------|------|
| F-AUTH-01 | メール+パスワードでサインアップ／ログイン | Must |
| F-AUTH-02 | Google OAuth でサインアップ／ログイン（既存メール統合あり） | Must |
| F-AUTH-03 | メール確認なしで利用可能（後日確認可能） | Should |
| F-AUTH-04 | パスワードリセット | Must |
| F-AUTH-05 | ログアウト・アカウント削除 | Must |
| F-AUTH-06 | プロフィール編集（名前・アバター） | Should |

### 3.2 マップ管理 (F-MAP)

| ID | 要件 | 優先度 |
|----|------|------|
| F-MAP-01 | マップ作成（タイトル・説明・カバー画像・公開 ON/OFF） | Must |
| F-MAP-02 | マップ一覧（カードグリッド・更新日順／作成日順） | Must |
| F-MAP-03 | マップ複製 | Should |
| F-MAP-04 | マップ削除（確認モーダル） | Must |
| F-MAP-05 | マップ検索（自分のマップ内タイトル/タグ） | Could |
| F-MAP-06 | 公開マップは `/m/[slug]` で誰でも閲覧可能 | Must |
| F-MAP-07 | iframe 埋め込みコード生成 | Should |

### 3.3 ポイント管理 (F-POINT)

| ID | 要件 | 優先度 |
|----|------|------|
| F-POINT-01 | 地図クリックで「下書きピン」を配置（ノンモーダル） | **Must / 最重要** |
| F-POINT-02 | 下書きピンは画面上部の「未保存バッジ」と連動、明示的に保存/破棄するまで保持 | **Must / 最重要** |
| F-POINT-03 | 下書きピン保持中も、他のポイントクリック・パネル開閉・日程切替がすべて可能 | **Must / 最重要** |
| F-POINT-04 | Places Autocomplete で場所検索 → クリックで下書きピン配置 | Must |
| F-POINT-05 | Place ID から Places Details を取得し、写真・評価・営業時間・電話を自動 pre-fill | Must |
| F-POINT-06 | ポイントに任意項目（タイトル・説明・画像URL・カテゴリ・時刻・費用・マーカー色）追加可能 | Must |
| F-POINT-07 | ポイントを日程（Day）に割り当て | Must |
| F-POINT-08 | ポイントの並び順をドラッグで変更（同一 Day 内 / Day 間） | Must |
| F-POINT-09 | ポイント削除（確認モーダル） | Must |
| F-POINT-10 | ポイント編集パネルは独立スライドオーバー（地図操作と並行可能） | Must |

### 3.4 日程管理 (F-DAY)

| ID | 要件 | 優先度 |
|----|------|------|
| F-DAY-01 | Day を追加・並べ替え・削除 | Must |
| F-DAY-02 | 各 Day に日付・タイトル・色を設定 | Must |
| F-DAY-03 | Day 内ポイントを Google Directions API で結ぶ実ルート表示（車/徒歩/自転車/公共交通） | Must |
| F-DAY-04 | Day ヘッダーに合計距離・合計時間・合計費用を表示 | Must |
| F-DAY-05 | Day 単位でのフィルタ表示（他 Day のマーカーを半透明化） | Should |
| F-DAY-06 | Day 内ポイントを CSV/JSON エクスポート | Could |

### 3.5 ビューア / ナビゲーション (F-VIEW)

| ID | 要件 | 優先度 |
|----|------|------|
| F-VIEW-01 | デスクトップ: 左パネル + 右地図のサイドバイサイド | Must |
| F-VIEW-02 | モバイル: 全画面地図 + ボトムシートでパネル | Must |
| F-VIEW-03 | 「←」「→」ボタン/キーで次ポイントへ flyTo | Must |
| F-VIEW-04 | ポイントクリックで InfoWindow + パネル該当行ハイライト | Must |
| F-VIEW-05 | 地図スタイル切替（道路/衛星/ハイブリッド/地形） | Must |
| F-VIEW-06 | ストリートビュー切替（Google 標準） | Should |

### 3.6 描画ツール (F-DRAW)

| ID | 要件 | 優先度 |
|----|------|------|
| F-DRAW-01 | ライン描画モード（色・太さ選択） | Should |
| F-DRAW-02 | ポリゴン描画モード | Could |
| F-DRAW-03 | 描画オブジェクトに名前・説明・色を設定 | Should |
| F-DRAW-04 | 描画オブジェクトの削除・編集 | Should |

### 3.7 チェックリスト (F-CHECK)

| ID | 要件 | 優先度 |
|----|------|------|
| F-CHECK-01 | 持ち物リスト（packing）の追加・チェック・削除 | Should |
| F-CHECK-02 | やることリスト（todo）の追加・チェック・削除 | Should |
| F-CHECK-03 | チェック済みを下部に自動移動 | Should |

### 3.8 共同編集 (F-COLLAB)

| ID | 要件 | 優先度 |
|----|------|------|
| F-COLLAB-01 | 招待リンク生成（閲覧/コメント/編集の3権限） | Should |
| F-COLLAB-02 | 編集者一覧表示・権限変更・削除 | Should |
| F-COLLAB-03 | 楽観ロック（updated_at 比較）で同時編集競合を防止 | Should |
| F-COLLAB-04 | アクティビティログ（誰がいつ何を変更したか） | Could |

### 3.9 共有・埋め込み (F-SHARE)

| ID | 要件 | 優先度 |
|----|------|------|
| F-SHARE-01 | 公開 ON で `/m/[slug]` 共有 URL 発行 | Must |
| F-SHARE-02 | iframe 埋め込みコード（幅・高さ・初期 Day 指定） | Should |
| F-SHARE-03 | OGP 画像自動生成 | Could |
| F-SHARE-04 | しおり PDF 出力 | Could |

---

## 4. UX要件（v3.0 最重要セクション）

### 4.1 ノンモーダル原則

> **いかなる操作も、他の操作をブロックしてはならない。**

| 操作 | v2.0（NG） | v3.0（OK） |
|------|----------|----------|
| 地図クリック | パネルが開き他操作不可 | 下書きピン配置・パネルは独立スライド |
| パネル開閉 | 編集中なら閉じられない | いつでも閉じられる（下書きは保持） |
| 別ポイントクリック | 編集中ならブロック | 即切替（下書きあれば通知のみ） |
| 日程切替 | 編集中ならブロック | 即切替 |

### 4.2 モード明示

地図右上に **モードトグル** を常設：

```
[👁 閲覧] [📍 追加] [✏️ 描画] [📏 計測]
```

- アクティブモードは色付きバッジで強調
- アクティブモード変更時はカーソル形状も変化（cursor: crosshair 等）

### 4.3 下書きライフサイクル

```
[下書き作成]
   │
   ├─→ 上部に「📍 未保存の地点があります（保存/破棄）」バー常時表示
   ├─→ 下書きピンは緑色＆点滅でハイライト
   │
   ├─→ [保存] → 通常マーカーに変化、バー消える
   ├─→ [破棄] → ピン削除、バー消える
   └─→ [別ページ遷移] → 確認モーダル「下書きを破棄しますか？」
```

### 4.4 フィードバック原則

| 操作 | 即時フィードバック |
|------|----------------|
| 保存 | Toast「保存しました」+ パネルにチェックマーク |
| 保存失敗 | Toast「保存できませんでした：[理由]」+ リトライボタン |
| 削除 | Toast「削除しました（元に戻す）」5秒間 |
| ネット切断 | バナー「オフラインです。再接続を待っています」 |

### 4.5 キーボードショートカット

| キー | 動作 |
|-----|------|
| ← / → | 前/次のポイントへ flyTo |
| Esc | 下書き破棄 確認 / パネル閉じる |
| Cmd+S / Ctrl+S | 下書き保存 |
| / | 検索フォーカス |
| ? | ヘルプ表示 |

---

## 5. 非機能要件

### 5.1 パフォーマンス (NF-PERF)

| ID | 要件 |
|----|------|
| NF-PERF-01 | 初回ロード LCP < 2.5s (4G 想定) |
| NF-PERF-02 | 地図初期表示 < 1.5s |
| NF-PERF-03 | ポイント 500 個でもスクロール 60fps |
| NF-PERF-04 | Places Autocomplete レスポンス < 300ms |

### 5.2 可用性 (NF-AVAIL)

| ID | 要件 |
|----|------|
| NF-AVAIL-01 | サービス可用性 99.5% |
| NF-AVAIL-02 | Supabase 障害時はキャッシュ閲覧モードに自動切替（書込のみ無効） |

### 5.3 セキュリティ (NF-SEC)

| ID | 要件 |
|----|------|
| NF-SEC-01 | Supabase RLS で全テーブル保護 |
| NF-SEC-02 | Google Maps API キーは HTTP リファラ制限 |
| NF-SEC-03 | Directions/Places Details はサーバー経由（API キー隠蔽） |
| NF-SEC-04 | XSS 対策（DOMPurify 経由でユーザー入力サニタイズ） |
| NF-SEC-05 | CSP ヘッダー設定 |
| NF-SEC-06 | レート制限：1ユーザー Places 100req/分、Directions 30req/分 |

### 5.4 アクセシビリティ (NF-A11Y)

| ID | 要件 |
|----|------|
| NF-A11Y-01 | WCAG 2.1 AA 準拠 |
| NF-A11Y-02 | キーボードだけで全機能操作可能 |
| NF-A11Y-03 | スクリーンリーダー対応（ARIA） |
| NF-A11Y-04 | カラーコントラスト 4.5:1 以上 |

### 5.5 ブラウザ対応

- Chrome / Edge / Safari / Firefox 最新2バージョン
- iOS Safari 16+
- Android Chrome 最新2バージョン

### 5.6 多言語

- v3.0: 日本語のみ
- v3.1: 英語追加（i18n 基盤は v3.0 で組む）

---

## 6. 制約条件

| 種別 | 制約 |
|------|------|
| 法的 | Google Maps Platform Terms 遵守（Place ID のみ保存、Details は表示時取得） |
| 法的 | 個人情報保護法・GDPR 対応（同意管理・データ削除権） |
| 技術 | Mapbox 関連コード・依存はすべて削除 |
| 技術 | 既存 v2.0 データは座標 + メタ情報を継承、Place ID は段階移行 |
| 運用 | Google Maps Platform 月額予算上限 ¥30,000（Phase 1） |

---

## 7. 用語定義

| 用語 | 定義 |
|------|------|
| マップ | 1ユーザーが作成する旅程地図の単位 |
| ポイント | マップ上の地点（場所） |
| 下書きピン | 未保存状態のポイント（緑色・点滅） |
| Day | マップ内の日程単位（Day 1, Day 2 …） |
| モード | 地図操作の状態（閲覧/追加/描画/計測） |
| Place ID | Google Places が地点に発行する一意 ID |

---

**Version 履歴**
- v1.0 (2026-04)
- v2.0 (2026-05-22)
- **v3.0 (2026-05-23): Google Maps Platform 採用、UX 全面再設計、ノンモーダル原則導入**
