# Viamaps テスト仕様書

2026年5月 / **Version 3.0（フルリビルド版）**

---

## 1. 概要

本書は Viamaps v3.0 のテスト戦略・テストケース・受入条件を定義する。

v3.0 では特に **「操作ロックを起こさないこと」** を回帰防止の最優先項目として、UX フローケースを厚く設定する。

---

## 2. テスト戦略

### 2.1 テストピラミッド

```
              ┌─────────┐
              │  E2E    │  Playwright
              │  ~30 件 │  クリティカルユーザーフロー
              ├─────────┤
              │ Integration │  Vitest + Testing Library
              │   ~100 件   │  Route Handler + RSC + Store
              ├─────────────┤
              │   Unit      │  Vitest
              │   ~300 件   │  関数・Store・ユーティリティ
              └─────────────┘
```

### 2.2 カバレッジ目標

| 種別 | 目標 |
|------|------|
| 関数 | 75%+ |
| ブランチ | 70%+ |
| ステートメント | 75%+ |
| UX クリティカルパス | 100%（必達） |

### 2.3 ツール

| 用途 | ツール |
|------|------|
| Unit/Integration | Vitest + @testing-library/react |
| E2E | Playwright (Chromium / WebKit / Mobile Chrome) |
| 視覚回帰 | Playwright screenshot diff |
| API モック | MSW |
| カバレッジ | Vitest c8 coverage |
| CI | GitHub Actions + Vercel Preview |

---

## 3. UX クリティカルパステスト（v3.0 必達）

### 3.1 操作ロック回帰テスト群

これらが1つでも失敗したら **リリース不可**。

#### TC-UX-01: 下書きピン作成中も別ポイントをクリックできる

```
前提: マップにポイント A, B が存在
手順:
  1. mode=add に切替
  2. 地図の任意座標をクリック → 下書きピン配置（DraftBanner 出現）
  3. ポイント A をクリック
期待:
  - 下書きピンは保持されたまま
  - ポイント A の InfoWindow が表示される
  - DraftBanner はそのまま表示
  - PointPanel は閉じたまま（ノンモーダル）
```

#### TC-UX-02: PointPanel を開いた状態でも地図クリックでき、別ポイントへ切替できる

```
前提: ポイント A を編集中（PointPanel が開いている）
手順:
  1. 地図上でポイント B をクリック
期待:
  - PointPanel の対象が即 B に切替（未保存の A 編集内容があれば「変更を破棄しますか？」モーダル）
  - 地図 panTo は無効化されない
```

#### TC-UX-03: 下書きあり状態で日程切替可能

```
前提: 下書きピン配置済
手順:
  1. サイドバーで Day 2 をクリック
期待:
  - Day 2 のポイント表示に切替
  - 下書きピンは地図上に残る
  - DraftBanner も残る
```

#### TC-UX-04: パネルを ✕ で閉じても下書きは消えない

```
前提: 下書きピンあり + 編集中
手順:
  1. PointPanel の ✕ をクリック
期待:
  - パネルが閉じる
  - 下書きピン、DraftBanner はそのまま
  - 再度パネルを開く操作（下書きピンクリック）でフォームに復帰
```

#### TC-UX-05: モード切替で操作が破壊されない

```
手順:
  1. mode=add で下書き配置
  2. mode=view に切替
  3. mode=add に戻す
期待:
  - 下書きピンは全工程で保持
  - mode=view 中に地図クリックしても下書きが移動しない
  - mode=add に戻したら地図クリックで下書きが移動する
```

#### TC-UX-06: 別ページ遷移時の下書き保護

```
前提: 下書きあり
手順:
  1. ヘッダーの「マイマップ」をクリック
期待:
  - 確認モーダル「下書きを破棄しますか？」が表示される
  - キャンセルで踏みとどまる
  - 破棄で遷移
```

#### TC-UX-07: 「+ スポットを追加」ボタンが silent fail しない

```
前提: 何もしていない状態
手順:
  1. サイドバーの「+ スポットを追加」をクリック
期待:
  - 必ず PointPanel が開く（pendingPoint 未設定でも開く）
  - 地図中央 or 選択中 Day のセントロイドに緑のピンが置かれる
  - フォーム入力 → 保存ボタンが活性化（タイトル必須以外）
```

#### TC-UX-08: 保存失敗時のリカバリ

```
前提: ネット切断中
手順:
  1. ポイントを編集 → 保存
期待:
  - 楽観 UI 更新で即時反映
  - サーバー応答失敗 → Toast「保存できませんでした [リトライ]」
  - ロールバックされない（楽観 state は維持、リトライ可能）
```

---

## 4. ユニットテスト

### 4.1 Store テスト

#### TS-STORE-01: modeStore
- 初期値 = 'view'
- setMode() で正常遷移
- アクション履歴が記録される（デバッグ用）

#### TS-STORE-02: draftStore
- setDraft / updateDraft / clearDraft の動作
- editorStore の編集状態とは独立してテスト

#### TS-STORE-03: editorStore
- applyLocal（楽観更新）
- applyRemote（リアルタイム同期）
- ロールバック（applyLocal → エラー → 元に戻る）
- 自分の更新 echo 抑制（clientEventId 一致）

### 4.2 ユーティリティ

#### TS-UTIL-01: lib/google/directions.ts
- waypoints → cache key 生成（同一入力で同一キー）
- キャッシュヒット時は外部 API を呼ばない
- TTL 切れで再フェッチ

#### TS-UTIL-02: lib/utils/slug.ts
- 日本語タイトル → ascii slug 生成

---

## 5. 結合テスト

### 5.1 Route Handler

#### TS-API-01: `/api/places/autocomplete`
- 正常リクエスト → 200 + suggestions
- 未認証 → 401
- レート制限超過 → 429
- Google API 失敗 → 502 (細部メッセージはサーバーログのみ)
- API キーがレスポンスに含まれない（漏洩防止）

#### TS-API-02: `/api/directions`
- 正常リクエスト → 200
- 同一リクエスト → 2回目はキャッシュヒット（外部 API 呼出 0）
- 不正 waypoints (1点のみ) → 400

#### TS-API-03: `/api/maps` CRUD
- 作成 → 取得 → 更新 → 削除の通しテスト
- 他人のマップにアクセス → 403
- 公開マップは未認証で取得可

#### TS-API-04: 楽観ロック
- マップを2人で同時更新 → 後発は 409
- 共同編集者の権限ごとに更新可否を判定

### 5.2 Supabase RPC

#### TS-RPC-01: reorder_points
- トランザクションで全件 order_index 更新
- 一部失敗時は全件ロールバック

---

## 6. E2E テスト（Playwright）

### 6.1 認証フロー

#### E2E-AUTH-01: メールサインアップ → ログイン
- /auth/register → 入力 → サインアップ
- ログアウト
- /auth/login → ログイン
- /maps に遷移

#### E2E-AUTH-02: Google OAuth
- /auth/login の Google ボタンクリック
- OAuth コールバック後 /maps へ
- 2回目ログインで既存アカウント統合

### 6.2 マップ作成 → 編集 → 共有

#### E2E-MAP-01: 新規マップ作成
- /maps/new → タイトル入力 → 作成
- /maps/[id] エディタへ遷移
- 地図が表示される

#### E2E-MAP-02: ポイント追加（Places 検索経由）
- エディタ で 「東京駅」を検索 → 候補クリック
- 下書きピン配置 + DraftBanner 表示
- PointPanel で時刻・費用入力 → 保存
- サイドバーに新ポイント出現
- Place ID 紐付きで評価情報が表示される

#### E2E-MAP-03: ポイント追加（地図クリック経由）
- mode=add に切替
- 地図の任意点をクリック → 下書き配置
- DraftBanner 「保存」 → PointPanel
- タイトル入力 → 保存

#### E2E-MAP-04: Day 管理 + Directions ルート表示
- 「+ Day 追加」で Day 1, Day 2 作成
- Day 1 にポイント3つ追加
- Day ヘッダーに距離・時間が表示される
- 地図に Day 1 のルート Polyline 表示

#### E2E-MAP-05: ナビゲーション
- ← → で順次 flyTo
- ← 押すと前のポイント、→ 押すと次のポイント

#### E2E-MAP-06: 公開 → 共有
- 設定画面で「公開する」ON
- 公開 URL コピー → 別ブラウザ（incognito）で開く
- ログイン不要で閲覧可能
- 編集 UI は表示されない

#### E2E-MAP-07: iframe 埋め込み
- 設定の iframe コードコピー
- テスト用ページに貼って表示
- ← → で動作

### 6.3 共同編集

#### E2E-COLLAB-01: 招待リンク
- 編集者として A が招待リンク生成
- B が別アカウントでリンクを開く → 承諾 → エディタへ
- B が編集 → A の画面にリアルタイム反映

#### E2E-COLLAB-02: 同時編集競合
- A, B が同じポイントを同時編集
- 後発に 409 → 「再読込しますか？」モーダル

### 6.4 v3.0 UX クリティカル E2E

#### E2E-UX-01: 操作ロックがないことを通し試験
- 下書き作成 → 別ポイントクリック → 別 Day 切替 → パネル開閉 → mode 切替 → 全て可能
- 下書きピンが工程通じて保持される

#### E2E-UX-02: モバイル操作
- iPhone 13 ビューポート
- ボトムシート展開 / 折りたたみ
- 全画面地図 + パネルがオーバーレイ表示
- ← → ボタンが押せる

### 6.5 パフォーマンス E2E

#### E2E-PERF-01: 500 ポイントマップ
- 500 ポイント seed データ作成
- LCP < 2.5s、スクロール 60fps（軽量 marker clustering 動作）

---

## 7. 視覚回帰テスト

Playwright `expect(page).toHaveScreenshot()` で：

| 画面 | スナップショット名 |
|------|----------------|
| /maps（空状態） | maps-empty |
| /maps（3カード） | maps-list |
| /maps/[id] エディタ（マーカー多数） | editor-busy |
| /maps/[id] PointPanel オープン | editor-panel-open |
| /maps/[id] DraftBanner 表示 | editor-draft |
| /m/[slug] 公開ビューア | viewer |

差分許容: 0.1%（フォントレンダリング差）

---

## 8. セキュリティテスト

| ID | 内容 |
|----|----|
| SEC-01 | 他ユーザーのマップ ID で API 直叩き → 403 |
| SEC-02 | XSS：ポイントタイトルに `<script>` → サニタイズされる |
| SEC-03 | CSRF：Server Actions の origin チェック |
| SEC-04 | Google Maps API キーがブラウザ DevTools で見えても、リファラ制限で別ドメインから使えない |
| SEC-05 | サーバー API キーは絶対にレスポンス body に含まれない |
| SEC-06 | レート制限：101 連続 Autocomplete → 101 回目は 429 |
| SEC-07 | SQL Injection：ポイントタイトル `'; DROP TABLE ...` → 影響なし |

---

## 9. アクセシビリティテスト

axe-core を Playwright に組み込み、各画面で違反ゼロを確認。

| 画面 | 重点項目 |
|------|--------|
| /maps/[id] | キーボードナビ、ARIA、フォーカストラップなし |
| PointPanel | role=dialog, aria-modal=false |
| DraftBanner | role=alert, aria-live=polite |
| ModeToggle | radiogroup ARIA |

---

## 10. CI/CD 統合

### 10.1 ワークフロー

```yaml
on: [push, pull_request]
jobs:
  test:
    steps:
      - pnpm install
      - pnpm typecheck
      - pnpm lint
      - pnpm test --coverage  # Vitest
      - pnpm test:e2e         # Playwright (PR時のみフル)
      - codecov upload
```

### 10.2 リリースゲート

リリース可能な条件：
- [ ] すべての Unit/Integration テスト Pass
- [ ] すべての TC-UX-* テスト Pass（v3.0 必達）
- [ ] カバレッジ目標達成
- [ ] axe-core 違反ゼロ
- [ ] Lighthouse Performance ≥ 85
- [ ] Sentry エラーレート < 0.5%（過去 24h Preview デプロイ）

---

## 11. 手動テスト（探索的）

リリース前に以下のシナリオで実機検証：

- iPhone Safari / Android Chrome 実機で「地図ピンチズーム → 下書き配置 → 保存」
- 低速回線（DevTools throttle 3G）でロード体感
- スクリーンリーダー（VoiceOver）で /maps/[id] 編集
- 100% ズーム / 200% ズームでレイアウト崩れなし
- 多言語キーボード入力（中国語 / 韓国語）

---

## 12. 受入基準（DoD）

新機能リリース時は以下を満たす：

1. [ ] 自動テスト追加（最低 1 Unit + 1 E2E）
2. [ ] 該当する画面定義書セクション更新
3. [ ] 該当する API 仕様書セクション更新
4. [ ] UX クリティカルパステスト通過
5. [ ] Sentry でリリース後 1h エラーゼロ
6. [ ] Preview デプロイで動作確認したスクリーンショットを PR に添付

---

**Version 履歴**
- v1.0 (2026-04)
- v2.0 (2026-05-22)
- **v3.0 (2026-05-23): UX クリティカルパステスト群 TC-UX-01〜08 新設、リリースゲート厳格化**
