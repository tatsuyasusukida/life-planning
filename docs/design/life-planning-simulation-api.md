# ライフプランニングシミュレーション API設計書

## 概要

ユーザーが自身の生年月日と開始・終了年を指定して、シンプルなライフプランシミュレーションを実行するためのAPIエンドポイントです。

## エンドポイント仕様

### POST /api/v1/life-planning/simulation

#### リクエスト

**Content-Type:** `application/json`

```json
{
  "birthDate": "1990-01-01",
  "startYear": 2020,
  "endYear": 2025
}
```

##### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| birthDate | string | ✓ | 生年月日（ISO 8601形式: YYYY-MM-DD） |
| startYear | number | ✓ | シミュレーション開始年（西暦） |
| endYear | number | ✓ | シミュレーション終了年（西暦） |

#### レスポンス

##### 成功時（200 OK）

```json
{
  "years": [
    {
      "year": 2020,
      "age": 30
    },
    {
      "year": 2021,
      "age": 31
    },
    {
      "year": 2022,
      "age": 32
    },
    {
      "year": 2023,
      "age": 33
    },
    {
      "year": 2024,
      "age": 34
    },
    {
      "year": 2025,
      "age": 35
    }
  ]
}
```

##### エラー時（400 Bad Request）

```json
{
  "error": "エラーメッセージ"
}
```

## エラーケース

| エラーメッセージ | 発生条件 |
|---|---|
| "Missing required parameter: [パラメータ名]" | 必須パラメータが不足している |
| "Invalid date format for birthDate: expected YYYY-MM-DD format" | 生年月日の形式が不正 |
| "Invalid type for [パラメータ名]: expected [期待する型], received [実際の型]" | パラメータの型が不正 |
| "Start year must be less than or equal to end year" | 開始年が終了年より大きい |
| "Age would exceed maximum allowed age of 150 years" | 終了年時点で150歳を超える |
| "Invalid JSON format" | リクエストボディのJSONが不正 |

## 実装詳細

### 年齢計算ロジック

年齢は各年の1月1日時点での満年齢として計算されます：

```
1月1日時点での満年齢 = 対象年 - 生年 - (1月1日 < その年の誕生日 ? 1 : 0)
```

この実装では、各年の1月1日時点で誕生日を迎えているかどうかを判定し、迎えていない場合は年齢から1を引きます。

### バリデーション

1. **Zodスキーマバリデーション**: リクエストボディの型、必須パラメータ、形式を自動検証
2. **年の範囲チェック**: 開始年 ≤ 終了年であることを確認
3. **年齢妥当性チェック**: 終了年時点で150歳を超えないことを確認
4. **JSONフォーマットチェック**: リクエストボディが有効なJSONかチェック

## 使用例

### 基本的な使用例

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "startYear": 2020,
    "endYear": 2025
  }'
```

### 単一年のシミュレーション

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1985-06-15",
    "startYear": 2024,
    "endYear": 2024
  }'
```

### 失敗ケースの例

#### 必須パラメータ不足

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "startYear": 2024
  }'
```

**レスポンス:**
```json
{
  "error": "Missing required parameter: endYear"
}
```

#### 不正な日付フォーマット

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990/01/01",
    "startYear": 2024,
    "endYear": 2025
  }'
```

**レスポンス:**
```json
{
  "error": "Invalid date format for birthDate: expected YYYY-MM-DD format"
}
```

#### 開始年が終了年より大きい

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "startYear": 2025,
    "endYear": 2024
  }'
```

**レスポンス:**
```json
{
  "error": "Start year must be less than or equal to end year"
}
```

#### 不正な型

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "startYear": "invalid",
    "endYear": 2025
  }'
```

**レスポンス:**
```json
{
  "error": "Invalid type for startYear: expected number, received string"
}
```

#### 年齢上限超過

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1850-01-01",
    "startYear": 2024,
    "endYear": 2025
  }'
```

**レスポンス:**
```json
{
  "error": "Age would exceed maximum allowed age of 150 years"
}
```

#### 不正なJSONフォーマット

```bash
curl -X POST http://localhost:8787/api/v1/life-planning/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01",
    "startYear": 2024,
    "endYear": 2025,
  }'
```

**レスポンス:**
```json
{
  "error": "Invalid JSON format"
}
```

## 将来の拡張可能性

- 誕生日を考慮した精密な年齢計算
- 収入・支出の予測機能
- ライフイベント（結婚、出産、退職など）の考慮
- 資産運用シミュレーション
- グラフ表示用データの生成