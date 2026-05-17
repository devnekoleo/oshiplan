# OshiPlan テスト仕様書

推し活遠征プランナーWebサービス

2026年5月 / Version 2.0

---

## 0. テスト方針

### 0.1 目的

- MVPリリース前に機能・セキュリティ・SEO・性能の品質を担保する
- 個人開発のため、自動化できるテストを優先し、手動確認は最小限にする

### 0.2 テスト種別と優先度

| 種別 | 対象 | 自動化 | 優先度 |
|------|------|--------|--------|
| 単体テスト（Unit） | バリデーション・ビジネスロジック | ✅ Vitest | 高 |
| APIテスト（Integration） | 各エンドポイント 正常系・異常系 | ✅ Vitest + fetch mock | 高 |
| E2Eテスト | 主要ユーザーフロー | ✅ **Playwright**（ブラウザ） | 高 |
| SEOテスト | OGP・Schema.org・Core Web Vitals | ✅ Playwright + Lighthouse CI | 高 |
| セキュリティテスト | 認証・認可・RLS・アフィリエイト不正 | 手動＋自動 | 高 |
| アフィリエイトテスト | リンク生成・クリック計測 | ✅ Vitest | 高 |
| 性能テスト | ページロード・AI生成レスポンスタイム | 手動計測 + Lighthouse | 中 |

> **変更点（旧仕様との差異）**: E2EをExpo Go（モバイル手動）からPlaywright（ブラウザ自動）に変更。SEOテストとアフィリエイトテストを新規追加。RevenueCat関連テストを削除。

### 0.3 テストID体系

```
T-[カテゴリ]-[連番]

カテゴリ:
  UNIT    単体テスト
  AUTH    認証・認可API
  USER    ユーザーAPI
  ART     推し（Artists）API
  PLAN    プランAPI
  SHARE   共有プランAPI
  AFF     アフィリエイトAPI・機能
  VENUE   会場API・ページ
  SEC     セキュリティ
  SEO     SEO・OGP
  PERF    性能
  E2E     E2Eシナリオ
```

### 0.4 合否基準

| 種別 | 合格基準 |
|------|---------|
| 単体テスト | カバレッジ 80%以上、全テストPASS |
| APIテスト | 全正常系PASS、主要異常系PASS |
| E2Eテスト | E2E-01〜05 が全てPASS |
| SEOテスト | Core Web Vitals グリーン、OGP正常表示 |
| セキュリティ | 全SEC・AFFテスト PASS |
| 性能テスト | AI生成 10秒以内、LCP 2.5秒以内 |

---

## 1. テスト環境

### 1.1 環境構成

| 環境 | URL | DB | 用途 |
|------|-----|----|------|
| ローカル | `http://localhost:3000` | Supabase Local (Docker) | 開発・単体テスト |
| Staging | `https://staging.oshiplan.app` | Supabase Staging Project | APIテスト・E2Eテスト |
| 本番 | `https://oshiplan.app` | Supabase Production | スモークテスト |

### 1.2 テストデータ

```
テストユーザー（ログイン済み）
  email: test@oshiplan.test
  password: TestPass123!
  daily_ai_used: 0

別ユーザー（アクセス制御確認用）
  email: other@oshiplan.test

ゲスト（未ログイン）
  IPアドレス: テスト用固定IP
  daily_ai_used: 0

テスト会場
  slug: tokyo-dome
  name: 東京ドーム
  rakuten_area_code: "test-area"
```

---

## 2. 単体テスト（Unit Test）

### 2.1 plan_json バリデーション（Zod）

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-01 | 正常なplan_jsonはバリデーション通過 | 全フィールドが正しい形式 | PASS |
| T-UNIT-02 | itineraryが空配列は失敗 | `itinerary: []` | `ZodError` |
| T-UNIT-03 | time が0埋めなし形式は失敗 | `time: "7:30"` | `ZodError` |
| T-UNIT-04 | estimated_cost が負数は失敗 | `estimated_cost: -1` | `ZodError` |
| T-UNIT-05 | accommodation が null は通過 | `accommodation: null` | PASS |
| T-UNIT-06 | affiliate_links に不正URLは失敗 | `rakuten: "not-a-url"` | `ZodError` |
| T-UNIT-07 | goods_links が6件は失敗 | 6件の配列 | `ZodError` |
| T-UNIT-08 | tips が11件は失敗 | 11件の配列 | `ZodError` |

### 2.2 レート制限チェックロジック

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-10 | 未ログイン daily_ai_used=2 は生成可 | type:guest, used:2 | `canGenerate: true` |
| T-UNIT-11 | 未ログイン daily_ai_used=3 は生成不可 | type:guest, used:3 | `canGenerate: false` |
| T-UNIT-12 | ログイン済み daily_ai_used=9 は生成可 | type:user, used:9 | `canGenerate: true` |
| T-UNIT-13 | ログイン済み daily_ai_used=10 は生成不可 | type:user, used:10 | `canGenerate: false` |

### 2.3 アフィリエイトURL生成

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-20 | 楽天トラベルURLに af パラメータが含まれる | area_code="tokyo-dome" | URL に `af=oshiplan` を含む |
| T-UNIT-21 | じゃらんURLに afid パラメータが含まれる | 正常入力 | URL に `afid=oshiplan` を含む |
| T-UNIT-22 | AmazonアソシエイトURLに tag が含まれる | ASIN入力 | URL に `tag=oshiplan-22` を含む |

### 2.4 share_token 生成

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-UNIT-30 | トークンが32文字の16進数 | `/^[0-9a-f]{32}$/` にマッチ |
| T-UNIT-31 | 2回生成しても一致しない | `token1 !== token2` |

---

## 3. APIテスト — 認証（AUTH）

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-AUTH-01 | 有効なCookieで認証必須エンドポイントにアクセス | 有効な Cookie | 200 |
| T-AUTH-10 | Cookie なしで認証必須エンドポイント | Cookie なし | 401 `UNAUTHORIZED` |
| T-AUTH-11 | 不正な Cookie | 破損したJWT | 401 `UNAUTHORIZED` |
| T-AUTH-12 | 期限切れ Cookie | 期限切れのJWT | 401 `UNAUTHORIZED` |
| T-AUTH-13 | 他ユーザーのリソースへのアクセス | 正規JWT + 他人のplan_id | 403 `FORBIDDEN` |

---

## 4. APIテスト — ユーザー（USER）

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-USER-01 | プロフィール取得 | 200、daily_ai_used / daily_ai_limit を含む |
| T-USER-02 | daily_ai_limit がログイン済みで10 | `daily_ai_limit: 10` |
| T-USER-10 | display_name 更新 | 200、更新後の値 |
| T-USER-11 | home_station 更新 | 200、更新後の値 |
| T-USER-12 | display_name が31文字は失敗 | 400 `VALIDATION_ERROR` |
| T-USER-20 | アカウント削除 | 204、再ログイン不可 |
| T-USER-21 | 削除後に plans / artists が消えている | DB にレコードなし |

---

## 5. APIテスト — 推し（ART）

旧仕様と同一のため省略。T-ART-01〜32 を参照。

---

## 6. APIテスト — プラン（PLAN）

### 6.1 GET `/api/plans`

T-PLAN-01〜06（旧仕様と同一）。

### 6.2 POST `/api/plans/generate` ⭐コア

**正常系**

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-PLAN-10 | 未ログインでプラン生成可 | Cookie なし | 201、plan_json生成 |
| T-PLAN-11 | 宿泊オプションありでaffiliate_linksが付与 | `stay_overnight: true` | `accommodation.affiliate_links.rakuten` が非null |
| T-PLAN-12 | 宿泊オプションなしでaccommodationがnull | `stay_overnight: false` | `accommodation: null` |
| T-PLAN-13 | 物販オプションありでmerch_line_adviceが非null | `merch: true` | `merch_line_advice` が文字列 |
| T-PLAN-14 | departure省略時はhome_stationが使用 | departure未指定 | departure = users.home_station |
| T-PLAN-15 | daily_ai_usedがインクリメント | 生成前used:1 | 生成後used:2 |
| T-PLAN-16 | plan_json が Zodスキーマに準拠 | 任意の正常リクエスト | schema validation PASS |

**異常系**

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-PLAN-20 | 未ログイン daily_ai_used=3 は429 | 3回消費済み（IP） | 429 `RATE_LIMIT_EXCEEDED` |
| T-PLAN-21 | ログイン済み daily_ai_used=10 は429 | 10回消費済み | 429 `RATE_LIMIT_EXCEEDED` |
| T-PLAN-22 | 過去の日付は失敗 | `event_date: "2020-01-01"` | 400 `VALIDATION_ERROR` |
| T-PLAN-23 | event_name が空は失敗 | `event_name: ""` | 400 `VALIDATION_ERROR` |
| T-PLAN-24 | Claude APIタイムアウト時はcountしない | APIタイムアウト模擬 | 503 `AI_UNAVAILABLE`、used変化なし |

### 6.3〜6.7 その他プランAPI

T-PLAN-30〜71（旧仕様準拠）。

**変更点**:
- 6.6 `POST /api/plans/:id/share`: Premiumチェックを削除。**全ユーザー無料で共有可能**。T-PLAN-62（`Freeユーザーは発行不可`）を削除。

---

## 7. APIテスト — 共有プラン（SHARE）

旧仕様と同一だが以下を追加：

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-SHARE-01〜05 | 旧仕様と同一 | — | — |
| T-SHARE-06 | 共有プランにaffiliateリンクが含まれる | 有効なtoken | `accommodation.affiliate_links` が非null |

---

## 8. APIテスト — アフィリエイト（AFF）【新規】

### 8.1 POST `/api/affiliate/click`

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-AFF-01 | クリック計測（正常）| 有効なリクエスト | 200、DBにレコードが作成される |
| T-AFF-02 | plan_idなしでも計測可 | `plan_id: null` | 200 |
| T-AFF-03 | 同一IP×同一URLは1時間に1カウント | 連続クリック | 2回目以降もDBへの追加なし（KVでブロック） |
| T-AFF-04 | affiliate_typeが不正値は400 | `type: "invalid"` | 400 `VALIDATION_ERROR` |
| T-AFF-05 | destination_urlが不正URLは400 | `destination_url: "not-url"` | 400 `VALIDATION_ERROR` |

### 8.2 アフィリエイトURL生成（Unit）

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-AFF-10 | plan_json に rakuten affiliate_link が含まれる | 宿泊オプションありの生成で rakuten URL が付与 |
| T-AFF-11 | affiliate URLに af=oshiplan が含まれる | 楽天URLに `af=oshiplan` パラメータ |
| T-AFF-12 | 共有プランにもaffiliate URLが含まれる | GET /api/shared/:token のレスポンスに含まれる |

---

## 9. APIテスト — 会場（VENUE）【新規】

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-VENUE-01 | 会場一覧取得 | 200、venues配列 |
| T-VENUE-02 | 会場詳細取得 | 200、nearby_hotels配列（アフィリエイトURL付き） |
| T-VENUE-03 | 存在しないslugは404 | 404 `NOT_FOUND` |
| T-VENUE-04 | nearby_hotelsにrakutenリンクが含まれる | rakutenプロパティが非null |
| T-VENUE-05 | 認証不要でアクセスできる | Cookie なし | 200 |

---

## 10. セキュリティテスト（SEC）

### 10.1 RLS（Row Level Security）

T-SEC-01〜05（旧仕様準拠、subscriptions関連は削除）。

### 10.2 API認証・認可

T-SEC-10〜13（旧仕様準拠）。

### 10.3 プロンプトインジェクション

T-SEC-20〜22（旧仕様準拠）。

### 10.4 レート制限

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-30 | 未ログイン: AI生成 4回目は429 | 同一IPで4回リクエスト | 4回目が 429 `RATE_LIMIT_EXCEEDED` |
| T-SEC-31 | ログイン済み: AI生成 11回目は429 | 同一ユーザーで11回 | 11回目が 429 |
| T-SEC-32 | レート制限は翌日リセットされる | 翌日に同IPでリクエスト | 200（リセット済み） |

### 10.5 アフィリエイト不正対策【新規】

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-40 | 同一IPの連続クリックは1時間に1カウント | 1時間以内に同URLを2回クリック | affiliate_clicks に1件のみ記録 |
| T-SEC-41 | affiliate URLが当サービスのURL以外にリダイレクトしない | destination_url を外部不審URLに設定 | バリデーションエラー or フィルタ |

---

## 11. SEOテスト（SEO）【新規】

### 11.1 会場別ページ（SSG）

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEO-01 | 会場別ページが正しいtitleを持つ | `/venue/tokyo-dome` にアクセス | `<title>東京ドーム 遠征プラン...` を含む |
| T-SEO-02 | OGPタグが設定されている | ページのHTMLを確認 | `og:title` / `og:description` / `og:image` が設定 |
| T-SEO-03 | Schema.orgのLocalBusinessが設定されている | HTMLを確認 | JSON-LDに `"@type": "LodgingBusiness"` 等 |
| T-SEO-04 | 会場ページがGoogleにインデックスされる | Google Search Console | インデックスステータス: 有効 |
| T-SEO-05 | robots.txtが正しく設定されている | `/robots.txt` | 会場ページが allow、API が disallow |

### 11.2 Core Web Vitals（Lighthouse CI）

| テストID | テスト名 | 計測方法 | 合格基準 |
|---------|---------|---------|---------|
| T-SEO-10 | トップページのLCP | Lighthouse CI | < 2.5秒 |
| T-SEO-11 | 会場別ページのLCP | Lighthouse CI | < 2.5秒 |
| T-SEO-12 | CLSスコア | Lighthouse CI | < 0.1 |
| T-SEO-13 | Performanceスコア | Lighthouse CI | ≥ 90 |

### 11.3 OGP画像（シェア時）

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-SEO-20 | 共有プランURLのOGP画像が生成される | X Card Validator で確認 | プラン情報を含む画像が表示 |
| T-SEO-21 | OGP画像に公演名・会場・概算費用が含まれる | 画像を目視確認 | 必要情報が視認できる |

---

## 12. 性能テスト（PERF）

| テストID | テスト名 | 手順 | 合格基準 |
|---------|---------|------|---------|
| T-PERF-01 | AIプラン生成のレスポンスタイム | 正常リクエストを5回計測 | 平均 10秒以内 |
| T-PERF-02 | 会場別ページの表示速度（SSG） | Lighthouse / WebPageTest | LCP < 1秒（CDNキャッシュ） |
| T-PERF-03 | プラン一覧取得のレスポンスタイム | 10件のプランがある状態で計測 | p95 500ms以内 |
| T-PERF-04 | 楽天トラベルAPI取得のレスポンスタイム | 会場詳細ページ計測 | ISRキャッシュ時 < 100ms |

---

## 13. E2Eテスト（Playwright）

### E2E-01 ゲストでのプラン生成フロー

**前提**: 未ログイン状態（ブラウザセッションなし）

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | トップページ（`/`）にアクセス | ページが表示される、ヘッダーに「ログイン」が表示 |
| 2 | 「遠征プランを作る」CTAをクリック | `/plans/new` に遷移 |
| 3 | 「スキップして次へ」をクリック（推し未登録） | Step2に遷移 |
| 4 | 公演名・会場名・日付・出発地を入力 | 入力完了 |
| 5 | 「次へ」をクリック | Step3に遷移 |
| 6 | オプションを設定して「遠征プランを生成する」をクリック | ローディング画面へ遷移 |
| 7 | 生成完了 | 生成結果ページに行程・宿泊情報が表示される |
| 8 | 宿泊の「楽天トラベルで予約する →」リンクを確認 | アフィリエイトURLが表示される |
| 9 | 「プランを保存する」をクリック | ログインモーダルが表示される |

**合否基準**: 全ステップが期待結果通りに動作すること

---

### E2E-02 ログインユーザーのプラン生成・保存・共有フロー

**前提**: ログイン済み

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | プラン作成フロー完了 → 「プランを保存する」 | `/plans/[id]` に遷移 |
| 2 | プラン詳細で宿泊セクションを確認 | 楽天・じゃらんのアフィリエイトリンクが表示 |
| 3 | 「しおりURLをコピー」をクリック | URLがクリップボードにコピーされる |
| 4 | 別ブラウザで共有URLを開く | 認証なしでプランが表示される |
| 5 | 共有ページにもアフィリエイトリンクが表示される | 楽天・じゃらんリンクが表示 |
| 6 | 「OshiPlanで自分のプランを作ってみよう」CTAを確認 | バナーが表示される |

---

### E2E-03 会場別ページからのプラン作成フロー（SEO流入シミュレーション）

**前提**: 未ログイン状態

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | `/venue/tokyo-dome` にアクセス | 東京ドームの会場情報ページが表示 |
| 2 | ページタイトルに「東京ドーム 遠征プラン」が含まれることを確認 | SEO設定が正しい |
| 3 | 周辺ホテル一覧を確認 | 2〜3件のホテルがアフィリエイトリンク付きで表示 |
| 4 | 「東京ドーム公演の遠征プランを作る（無料）」CTAをクリック | `/plans/new?venue=tokyo-dome` に遷移 |
| 5 | 会場名が「東京ドーム」で自動入力されていることを確認 | 入力済みの状態 |
| 6 | プラン生成完了 | プランが生成される |

---

### E2E-04 レート制限フロー（ゲストユーザー）

**前提**: 未ログイン状態、当日2回プランを生成済み

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | 3回目のプラン生成を完了させる | プランが生成される |
| 2 | 4回目のプラン生成を試みる（Step3で生成ボタンをクリック） | エラーモーダルが表示される |
| 3 | モーダルに「本日の生成上限（3回）に達しました」が表示される | 正しいメッセージ |
| 4 | 「ログインすると10回まで使えます」CTAが表示される | ログイン促進 |
| 5 | CTAをクリックしてログインページへ | `/auth/login` に遷移 |

---

### E2E-05 アフィリエイトクリック計測フロー

**前提**: ログイン済み、プラン詳細ページを表示中

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | プラン詳細の「楽天トラベルで予約する →」をクリック | 新しいタブで楽天トラベルが開く |
| 2 | ネットワークログで `POST /api/affiliate/click` が呼ばれる | リクエストが発行される |
| 3 | DB の affiliate_clicks テーブルにレコードが作成される | 1件追加 |
| 4 | 再度クリックする | 同じURLへの2回目クリック |
| 5 | affiliate_clicks のレコードが増えない（1時間制限） | カウント変化なし |

---

## 14. リグレッションテスト（スモークテスト）

デプロイ後に毎回実行する最小限のチェックリスト。

| # | 確認項目 | 確認方法 |
|---|---------|---------|
| 1 | トップページが表示される | `/` にアクセス → 200 |
| 2 | 会場別ページが表示される | `/venue/tokyo-dome` → 200、SSGページ |
| 3 | ゲストでプラン生成できる | POST /api/plans/generate → 201 |
| 4 | アフィリエイトリンクが生成されている | 201レスポンスに `affiliate_links.rakuten` が存在 |
| 5 | 共有プランが閲覧できる | 既存トークンで GET /api/shared/:token → 200 |
| 6 | ログインできる | メール認証でログイン成功 |

---

## 15. テスト実行順序と優先度まとめ

```
【リリース前に必須】
  Phase 1（高）: T-UNIT-*           → ロジックの保証
  Phase 2（高）: T-AUTH-*, T-SEC-*  → セキュリティの保証
  Phase 3（高）: T-PLAN-10〜24      → コア機能（AI生成）の保証
  Phase 4（高）: T-AFF-*            → アフィリエイト機能の保証
  Phase 5（高）: E2E-01〜05         → ブラウザE2Eの自動実行
  Phase 6（高）: T-SEO-01〜05       → SEO設定の確認

【リリース前に推奨】
  Phase 7（中）: T-USER-*, T-ART-*, T-PLAN-30〜71, T-SHARE-*, T-VENUE-*
  Phase 8（中）: T-SEO-10〜21, T-PERF-*

【リリース後】
  スモークテスト: デプロイごとに実施
```

---

## 16. テストツール・コマンド参考

```bash
# 単体テスト実行（Vitest）
npx vitest run

# カバレッジ計測
npx vitest run --coverage

# E2Eテスト実行（Playwright）
npx playwright test

# E2E レポート表示
npx playwright show-report

# Lighthouse CI
npx lhci autorun

# Supabase ローカル起動
supabase start

# テストデータ投入
supabase db reset
psql $TEST_DATABASE_URL < tests/seed.sql
```
