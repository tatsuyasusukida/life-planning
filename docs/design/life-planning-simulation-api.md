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
| "Missing required parameters" | 必須パラメータが不足している |
| "Invalid birth date format" | 生年月日の形式が不正 |
| "Start year must be less than or equal to end year" | 開始年が終了年より大きい |
| "Invalid JSON format" | リクエストボディのJSONが不正 |

## 実装詳細

### 年齢計算ロジック

年齢は以下の計算で求められます：

```
年齢 = 対象年 - 生年
```

この実装では、誕生日を考慮せず、単純に年の差を計算しています。

### バリデーション

1. **必須パラメータチェック**: すべてのパラメータが存在することを確認
2. **日付フォーマットチェック**: `new Date()`で解析可能な形式かチェック
3. **年の範囲チェック**: 開始年 ≤ 終了年であることを確認
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

## 将来の拡張可能性

- 誕生日を考慮した精密な年齢計算
- 収入・支出の予測機能
- ライフイベント（結婚、出産、退職など）の考慮
- 資産運用シミュレーション
- グラフ表示用データの生成