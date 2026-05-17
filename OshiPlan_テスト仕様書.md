# OshiPlan テスト仕様書

推し活遠征プランナーアプリ

2026年5月 / Version 1.0 (MVP)

---

## 0. テスト方針

### 0.1 目的

- MVPリリース前に機能・セキュリティ・性能の品質を担保する
- 個人開発のため、自動化できるテストを優先し、手動確認は最小限にする

### 0.2 テスト種別と優先度

| 種別 | 対象 | 自動化 | 優先度 |
|------|------|--------|--------|
| 単体テスト（Unit） | バリデーション・ビジネスロジック | ✅ Jest / Vitest | 高 |
| APIテスト（Integration） | 各エンドポイント 正常系・異常系 | ✅ Supertest / Hono Test | 高 |
| E2Eテスト | 主要ユーザーフロー | 手動（Expo Go） | 高 |
| セキュリティテスト | 認証・認可・RLS | 手動＋自動 | 高 |
| 性能テスト | AI生成レスポンスタイム | 手動計測 | 中 |

### 0.3 テストID体系

```
T-[カテゴリ]-[連番]

カテゴリ:
  UNIT   単体テスト
  AUTH   認証・認可API
  USER   ユーザーAPI
  ART    推し（Artists）API
  PLAN   プランAPI
  SHARE  共有プランAPI
  HOOK   Webhook
  SEC    セキュリティ
  PERF   性能
  E2E    E2Eシナリオ
```

### 0.4 合否基準

| 種別 | 合格基準 |
|------|---------|
| 単体テスト | カバレッジ 80%以上、全テストPASS |
| APIテスト | 全正常系PASS、主要異常系PASS |
| E2Eテスト | 主要シナリオ（E2E-01〜04）が手動で通ること |
| セキュリティ | 全SECテスト PASS |
| 性能テスト | AI生成 10秒以内、その他API 500ms以内（p95） |

---

## 1. テスト環境

### 1.1 環境構成

| 環境 | URL | DB | 用途 |
|------|-----|----|------|
| ローカル | `http://localhost:3000` | Supabase Local (Docker) | 開発・単体テスト |
| Staging | `https://staging.api.oshiplan.app` | Supabase Staging Project | APIテスト・E2Eテスト |
| 本番 | `https://api.oshiplan.app` | Supabase Production | リリース後スモークテスト |

### 1.2 テストデータ

```
テストユーザー（Free）
  email: test-free@oshiplan.test
  password: TestPass123!
  subscription_tier: free
  monthly_ai_used: 0

テストユーザー（Premium）
  email: test-premium@oshiplan.test
  password: TestPass123!
  subscription_tier: premium_monthly

テスト推し
  name: テスト推し A
  category: idol

別ユーザー（アクセス制御確認用）
  email: other-user@oshiplan.test
```

---

## 2. 単体テスト（Unit Test）

### 2.1 plan_json バリデーション（Zod）

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-01 | 正常なplan_jsonはバリデーション通過 | 全フィールドが正しい形式 | PASS |
| T-UNIT-02 | itineraryが空配列は失敗 | `itinerary: []` | `ZodError` |
| T-UNIT-03 | itinerary timeが不正形式は失敗 | `time: "7:30"` (0埋めなし) | `ZodError` |
| T-UNIT-04 | estimated_costが負数は失敗 | `estimated_cost: -1` | `ZodError` |
| T-UNIT-05 | accommodationがnullは通過 | `accommodation: null` | PASS |
| T-UNIT-06 | merch_line_adviceが501文字は失敗 | 501文字の文字列 | `ZodError` |
| T-UNIT-07 | tipsが11件は失敗 | `tips: [×11]` | `ZodError` |
| T-UNIT-08 | booking_urlがURL形式でない場合は失敗 | `booking_url: "not-a-url"` | `ZodError` |

### 2.2 利用枠チェックロジック

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-10 | Freeユーザー monthly_ai_used=2 は生成可 | tier:free, used:2 | `canGenerate: true` |
| T-UNIT-11 | Freeユーザー monthly_ai_used=3 は生成不可 | tier:free, used:3 | `canGenerate: false` |
| T-UNIT-12 | Premiumユーザー monthly_ai_used=99 は生成可 | tier:premium_monthly, used:99 | `canGenerate: true` |
| T-UNIT-13 | Premiumユーザー monthly_ai_used=100 は生成不可 | tier:premium_monthly, used:100 | `canGenerate: false` |

### 2.3 share_token 生成

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-UNIT-20 | トークンが32文字の16進数文字列 | `/^[0-9a-f]{32}$/` にマッチ |
| T-UNIT-21 | 2回生成しても一致しない（衝突なし） | `token1 !== token2` |

### 2.4 RevenueCat product_id → subscription_tier 変換

| テストID | テスト名 | 入力 | 期待結果 |
|---------|---------|------|---------|
| T-UNIT-30 | 月額プランIDの変換 | `oshiplan_premium_monthly` | `premium_monthly` |
| T-UNIT-31 | 年額プランIDの変換 | `oshiplan_premium_yearly` | `premium_yearly` |
| T-UNIT-32 | 不明なプランIDはエラー | `unknown_product` | `Error` |

---

## 3. APIテスト — 認証（AUTH）

### 3.1 正常系

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-AUTH-01 | 有効なJWTで認証必須エンドポイントにアクセス | 有効な `Bearer <token>` | 200 |
| T-AUTH-02 | 有効なJWTで `/api/users/me` 取得 | 有効な `Bearer <token>` | 200、自分のユーザー情報 |

### 3.2 異常系

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-AUTH-10 | Authorizationヘッダーなし | ヘッダーなし | 401 `UNAUTHORIZED` |
| T-AUTH-11 | 不正なトークン形式 | `Bearer invalidtoken` | 401 `UNAUTHORIZED` |
| T-AUTH-12 | 期限切れトークン | 期限切れのJWT | 401 `UNAUTHORIZED` |
| T-AUTH-13 | 別ユーザーのトークンで他人のプラン取得 | 正規JWT + 他人のplan_id | 403 `FORBIDDEN` |

---

## 4. APIテスト — ユーザー（USER）

### 4.1 GET `/api/users/me`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-USER-01 | プロフィール取得（正常） | 200、`id / email / subscription_tier / monthly_ai_used` を含む |
| T-USER-02 | monthly_ai_limitがFreeで3 | 200、`monthly_ai_limit: 3` |
| T-USER-03 | monthly_ai_limitがPremiumで100 | 200、`monthly_ai_limit: 100` |

### 4.2 PATCH `/api/users/me`

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-USER-10 | display_name更新 | `{"display_name": "新しい名前"}` | 200、更新後の値 |
| T-USER-11 | home_station更新 | `{"home_station": "大阪駅"}` | 200、更新後の値 |
| T-USER-12 | display_nameが31文字は失敗 | 31文字の文字列 | 400 `VALIDATION_ERROR` |
| T-USER-13 | display_nameが空文字は失敗 | `{"display_name": ""}` | 400 `VALIDATION_ERROR` |
| T-USER-14 | 空のボディは何も変更しない | `{}` | 200、変更なし |

### 4.3 DELETE `/api/users/me`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-USER-20 | アカウント削除 | 204、再度ログイン不可 |
| T-USER-21 | 削除後に plans / artists が消えている | DBにレコードなし |

---

## 5. APIテスト — 推し（ART）

### 5.1 GET `/api/artists`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-ART-01 | 推し一覧取得（登録あり） | 200、`artists` 配列 |
| T-ART-02 | 推し未登録ユーザーは空配列 | 200、`artists: []` |
| T-ART-03 | 他ユーザーの推しは含まれない | 200、自分の推しのみ |

### 5.2 POST `/api/artists`

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-ART-10 | 推し登録（正常） | `{"name": "A", "category": "idol"}` | 201、登録データ |
| T-ART-11 | 全カテゴリで登録可 | `category: "anime"` 等 | 201 |
| T-ART-12 | name が空は失敗 | `{"name": "", "category": "idol"}` | 400 `VALIDATION_ERROR` |
| T-ART-13 | name が51文字は失敗 | 51文字の name | 400 `VALIDATION_ERROR` |
| T-ART-14 | category が不正値は失敗 | `{"category": "vtuber"}` | 400 `VALIDATION_ERROR` |
| T-ART-15 | category がない場合は失敗 | `{"name": "A"}` | 400 `VALIDATION_ERROR` |

### 5.3 PATCH `/api/artists/:id`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-ART-20 | 名前変更（正常） | 200、更新後のデータ |
| T-ART-21 | カテゴリ変更（正常） | 200、更新後のデータ |
| T-ART-22 | 存在しないidは404 | 404 `NOT_FOUND` |
| T-ART-23 | 他ユーザーの推しは403 | 403 `FORBIDDEN` |

### 5.4 DELETE `/api/artists/:id`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-ART-30 | 推し削除（正常） | 204 |
| T-ART-31 | 削除後に紐づくプランは残る | plans の artist_id は保持 |
| T-ART-32 | 他ユーザーの推しは削除不可 | 403 `FORBIDDEN` |

---

## 6. APIテスト — プラン（PLAN）

### 6.1 GET `/api/plans`

| テストID | テスト名 | クエリ | 期待結果 |
|---------|---------|-------|---------|
| T-PLAN-01 | プラン一覧取得（upcoming） | `type=upcoming` | 200、event_date >= 今日のプランのみ |
| T-PLAN-02 | プラン一覧取得（past） | `type=past` | 200、event_date < 今日のプランのみ |
| T-PLAN-03 | デフォルトはupcoming | クエリなし | 200、upcoming相当 |
| T-PLAN-04 | limit指定 | `limit=5` | 200、5件以下 |
| T-PLAN-05 | offset指定（ページネーション） | `offset=10` | 200、11件目以降 |
| T-PLAN-06 | 他ユーザーのプランは含まれない | — | 200、自分のプランのみ |

### 6.2 POST `/api/plans/generate` ⭐コア

**正常系**

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-PLAN-10 | AIプラン生成（日帰り） | `stay_overnight: false` | 201、plan_json に宿泊なし |
| T-PLAN-11 | AIプラン生成（1泊） | `stay_overnight: true` | 201、plan_json に accommodation あり |
| T-PLAN-12 | 物販オプションあり | `merch: true` | 201、merch_line_advice が非null |
| T-PLAN-13 | 聖地巡礼オプションあり | `pilgrimage: true` | 201、tips に聖地情報を含む |
| T-PLAN-14 | departure省略時はhome_stationが使用される | departure未指定 | 201、departure = users.home_station |
| T-PLAN-15 | monthly_ai_usedがインクリメントされる | 生成前used:1 | 生成後used:2 |
| T-PLAN-16 | plan_json が Zodスキーマに準拠 | 任意の正常リクエスト | schema validation PASS |

**異常系**

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-PLAN-20 | Free枠超過（3回目消費済み） | monthly_ai_used: 3 | 429 `AI_QUOTA_EXCEEDED` |
| T-PLAN-21 | Premium日次上限超過 | monthly_ai_used: 100, Premium | 429 `AI_QUOTA_EXCEEDED` |
| T-PLAN-22 | 過去の日付は失敗 | `event_date: "2020-01-01"` | 400 `VALIDATION_ERROR` |
| T-PLAN-23 | event_name が空は失敗 | `event_name: ""` | 400 `VALIDATION_ERROR` |
| T-PLAN-24 | venue_hint が81文字は失敗 | 81文字 | 400 `VALIDATION_ERROR` |
| T-PLAN-25 | 他ユーザーのartist_idは失敗 | 他人のartist_id | 400 `VALIDATION_ERROR` |
| T-PLAN-26 | Claude APIタイムアウト時はmonthly_ai_usedをカウントしない | APIタイムアウト模擬 | 503 `AI_UNAVAILABLE`、used変化なし |

### 6.3 GET `/api/plans/:id`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-PLAN-30 | プラン詳細取得（正常） | 200、plan_json を含む全フィールド |
| T-PLAN-31 | 存在しないidは404 | 404 `NOT_FOUND` |
| T-PLAN-32 | 他ユーザーのプランは403 | 403 `FORBIDDEN` |

### 6.4 PATCH `/api/plans/:id`

| テストID | テスト名 | リクエスト | 期待結果 |
|---------|---------|----------|---------|
| T-PLAN-40 | plan_json更新（正常） | 正しいplan_json | 200、更新後のデータ |
| T-PLAN-41 | itineraryのみ変更 | itineraryを差し替え | 200 |
| T-PLAN-42 | plan_jsonのスキーマ違反は失敗 | `itinerary: []` | 400 `VALIDATION_ERROR` |
| T-PLAN-43 | 他ユーザーのプランは更新不可 | 他人のplan_id | 403 `FORBIDDEN` |

### 6.5 DELETE `/api/plans/:id`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-PLAN-50 | プラン削除（正常） | 204 |
| T-PLAN-51 | 削除後に plan_records も消える | DBに plan_records なし |
| T-PLAN-52 | 他ユーザーのプランは削除不可 | 403 `FORBIDDEN` |
| T-PLAN-53 | 存在しないidは404 | 404 `NOT_FOUND` |

### 6.6 POST `/api/plans/:id/share`

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-PLAN-60 | 共有トークン発行（Premium） | Premium ユーザー | 200、`share_token` と `share_url` |
| T-PLAN-61 | 再発行で古いトークンは無効化 | 2回連続発行 | 2回目のみ有効 |
| T-PLAN-62 | Freeユーザーは発行不可 | Free ユーザー | 403 `PREMIUM_REQUIRED` |
| T-PLAN-63 | 他ユーザーのプランは発行不可 | 他人のplan_id | 403 `FORBIDDEN` |

### 6.7 DELETE `/api/plans/:id/share`

| テストID | テスト名 | 期待結果 |
|---------|---------|---------|
| T-PLAN-70 | 共有トークン無効化（正常） | 204、share_token が null に |
| T-PLAN-71 | 無効化後の共有URLは404 | `GET /api/shared/:token` → 404 |

---

## 7. APIテスト — 共有プラン（SHARE）

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-SHARE-01 | 共有プラン閲覧（正常・未認証） | 有効な token | 200、plan_json 含む |
| T-SHARE-02 | レスポンスに user_id / artist_id は含まれない | 有効な token | user_id, artist_id なし |
| T-SHARE-03 | 存在しないトークンは404 | 不正な token | 404 `NOT_FOUND` |
| T-SHARE-04 | 無効化済みトークンは404 | 削除済みトークン | 404 `NOT_FOUND` |
| T-SHARE-05 | 認証なしでアクセスできる | Authorization ヘッダーなし | 200 |

---

## 8. APIテスト — Webhook（HOOK）

| テストID | テスト名 | 条件 | 期待結果 |
|---------|---------|------|---------|
| T-HOOK-01 | INITIAL_PURCHASE で subscription_tier 更新 | type: INITIAL_PURCHASE | 200、users.subscription_tier = premium_monthly |
| T-HOOK-02 | INITIAL_PURCHASE で subscriptions に INSERT | type: INITIAL_PURCHASE | 200、subscriptions テーブルに新レコード |
| T-HOOK-03 | RENEWAL で expires_at 更新 | type: RENEWAL | 200、subscriptions.expires_at 更新 |
| T-HOOK-04 | EXPIRATION で subscription_tier = free | type: EXPIRATION | 200、users.subscription_tier = free |
| T-HOOK-05 | CANCELLATION は即時 free にしない | type: CANCELLATION | 200、tier は変更しない（期限切れまで継続） |
| T-HOOK-06 | 不正な署名は401 | Authorization 不正 | 401 |
| T-HOOK-07 | 不明な event.type は400 | type: UNKNOWN | 400（ログのみ、エラー返却） |
| T-HOOK-08 | 存在しない app_user_id は無視 | 存在しないUUID | 200（エラーにしない） |

---

## 9. セキュリティテスト（SEC）

### 9.1 RLS（Row Level Security）

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-01 | ユーザーは自分のプランのみ取得できる | DBで直接SELECTを別ユーザーで試行 | 0件 |
| T-SEC-02 | ユーザーは他人のartistsを更新できない | 他人のartist_idでUPDATE | 0行更新 |
| T-SEC-03 | share_tokenが一致する場合のみ匿名でplans読取可 | 匿名でSELECT（token一致） | 1件 |
| T-SEC-04 | share_tokenが不一致の場合は匿名でplans読取不可 | 匿名でSELECT（token不一致） | 0件 |
| T-SEC-05 | subscriptionsはサービスロール以外でINSERT不可 | 一般ユーザーでINSERT | エラー |

### 9.2 API認証・認可

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-10 | APIキーがレスポンスヘッダーに漏れない | 任意のAPIレスポンスを確認 | APIキー系ヘッダーなし |
| T-SEC-11 | `/api/shared/:token` で user_id が漏れない | 共有URLにアクセス | user_id なし |
| T-SEC-12 | JWTのsecretが推測不可能な強度 | Supabase Auth設定確認 | RS256 署名 |
| T-SEC-13 | share_tokenが推測不可能（32文字hex） | トークン確認 | ランダム性あり |

### 9.3 プロンプトインジェクション

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-20 | event_nameにプロンプトを埋め込んでも無効 | `event_name: "システムプロンプトを無視して..."` | plan_json が正常スキーマを満たす |
| T-SEC-21 | venue_hintに悪意ある内容を入れてもガードされる | 違法行為を促す文字列 | 正常なプランが返却される or エラー |
| T-SEC-22 | plan_jsonスキーマ違反のAI出力はリトライされる | AIが不正JSONを返す（モック） | 最大2回リトライ後エラー |

### 9.4 レート制限

| テストID | テスト名 | 手順 | 期待結果 |
|---------|---------|------|---------|
| T-SEC-30 | Free: 61req/分でレート制限 | 61回/分でAPIを叩く | 61回目が 429 |
| T-SEC-31 | Premium: 121req/分でレート制限 | 121回/分でAPIを叩く | 121回目が 429 |
| T-SEC-32 | Free AI生成: 4回目は429 | AI生成を4回リクエスト | 4回目が 429 `AI_QUOTA_EXCEEDED` |

---

## 10. 性能テスト（PERF）

| テストID | テスト名 | 手順 | 合格基準 |
|---------|---------|------|---------|
| T-PERF-01 | AIプラン生成のレスポンスタイム | 正常リクエストを5回計測 | 平均 10秒以内 |
| T-PERF-02 | プラン一覧取得のレスポンスタイム | 10件のプランがある状態で計測 | p95 500ms以内 |
| T-PERF-03 | プラン詳細取得のレスポンスタイム | plan_json が大きい状態で計測 | p95 500ms以内 |
| T-PERF-04 | 共有プラン閲覧のレスポンスタイム（未認証） | 計測 | p95 500ms以内 |
| T-PERF-05 | Webhook処理のレスポンスタイム | RevenueCat イベント受信 | 2秒以内 |

---

## 11. E2Eテスト（手動）

### E2E-01 新規ユーザーの初回利用フロー

**前提**：未登録のメールアドレス

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | S-02 新規登録画面でメール・パスワードを入力して「登録する」 | 確認メール送信のメッセージ |
| 2 | S-51 プロフィール設定で display_name・home_station を入力して保存 | S-10 ホームへ遷移 |
| 3 | S-41 推し登録で「テスト推し A / idol」を登録 | S-40 推し一覧に表示される |
| 4 | BottomTabの「＋」をタップ → S-30 プラン作成 Step1 | 推し一覧が表示される |
| 5 | 推しを選択 → 次へ（S-31） | Step2に遷移 |
| 6 | 公演名・会場・日付・出発地を入力 → 次へ（S-32） | Step3に遷移 |
| 7 | オプションを設定 → 「プランを生成する」 | S-33 ローディング画面へ |
| 8 | 生成完了後 → S-34 生成結果確認 | plan_json の行程が表示される |
| 9 | 「このまま保存」をタップ | S-21 プラン詳細へ遷移 |
| 10 | S-20 プラン一覧を確認 | 保存したプランが表示される |

**合否基準**：全ステップが期待結果通りに動作すること

---

### E2E-02 プラン共有フロー（Premium）

**前提**：Premiumユーザーとして認証済み、プランが1件以上存在

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | S-21 プラン詳細で「しおりを共有する」をタップ | ネイティブ共有シートが開く |
| 2 | 共有URLをコピー | `oshiplan.app/shared/[token]` 形式のURL |
| 3 | 別のブラウザ/デバイスで共有URLにアクセス | S-25 共有プラン閲覧が表示される |
| 4 | 共有画面に「編集」ボタンがないことを確認 | 読み取り専用 |
| 5 | 「OshiPlanで作成する →」バナーをタップ | App Store / Google Play へ遷移 |

---

### E2E-03 Free枠超過 → Premium誘導フロー

**前提**：Freeユーザー、monthly_ai_used = 2（残り1回）

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | S-32 Step3 で「残り生成回数：1回」と表示される | 正しく残回数が表示される |
| 2 | プランを生成 → S-34 確認 → 保存 | monthly_ai_used = 3 になる |
| 3 | 再度 S-32 を開く | 「残り0回」表示、生成ボタンがグレーアウト |
| 4 | Premium誘導バナーをタップ | S-52 サブスクリプション管理へ遷移 |
| 5 | 「月額プランに登録する」をタップ | RevenueCat 購入フローが起動 |

---

### E2E-04 遠征プラン編集フロー

**前提**：認証済み、プランが1件以上存在

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | S-21 プラン詳細で「編集する」をタップ | S-22 プラン編集へ遷移 |
| 2 | 行程の1つ目の時刻を「08:00」に変更 | 行程に反映される |
| 3 | 「保存する」をタップ | S-21 プラン詳細へ遷移 |
| 4 | 変更が反映されていることを確認 | 「08:00」が表示される |

---

### E2E-05 オフライン表示確認

**前提**：認証済み、S-21 プラン詳細を一度表示済み

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | デバイスをオフライン（機内モード）にする | — |
| 2 | S-21 プラン詳細を開く | キャッシュからプランが表示される |
| 3 | 行程タイムラインが表示されている | 正常に閲覧できる |
| 4 | 「編集する」をタップ | 編集不可のメッセージ or ボタン非活性 |

---

## 12. リグレッションテスト（スモークテスト）

リリース後・デプロイ後に毎回実行する最小限のチェックリスト。

| # | 確認項目 | 確認方法 |
|---|---------|---------|
| 1 | ログインできる | メール認証でログイン |
| 2 | プラン一覧が取得できる | `GET /api/plans` → 200 |
| 3 | AI生成が動作する | 1件プランを生成 → 201 |
| 4 | 共有プランが閲覧できる | 既存の共有URLにアクセス → 200 |
| 5 | Webhookエンドポイントが疎通する | `POST /api/webhooks/revenuecat` → 200 |

---

## 13. テスト実行順序と優先度まとめ

```
【リリース前に必須】
  Phase 1（高）: T-UNIT-*         → ロジックの保証
  Phase 2（高）: T-AUTH-*, T-SEC-* → セキュリティの保証
  Phase 3（高）: T-PLAN-10〜26    → コア機能（AI生成）の保証
  Phase 4（高）: E2E-01〜04       → 主要フロー手動確認

【リリース前に推奨】
  Phase 5（中）: T-USER-*, T-ART-*, T-PLAN-30〜71, T-SHARE-*, T-HOOK-*
  Phase 6（中）: T-PERF-*

【リリース後】
  リグレッション（スモークテスト）: デプロイごとに実施
```

---

## 14. テストツール・コマンド参考

```bash
# 単体テスト実行（Vitest）
npx vitest run

# カバレッジ計測
npx vitest run --coverage

# APIテスト実行（Supertest / Hono）
npx jest --testPathPattern=api

# Supabase ローカル起動
supabase start

# テストデータ投入
supabase db reset --db-url $TEST_DATABASE_URL
psql $TEST_DATABASE_URL < tests/seed.sql
```
