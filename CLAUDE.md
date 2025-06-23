# CLAUDE.md

このファイルは、このリポジトリでコードを作業する際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

これは、ライフプランニングアプリケーションを構築するためのHonoフレームワークを使用したCloudflare Workersプロジェクトです。TypeScript、Biome（リント/フォーマット用）、Vitest（テスト用）で構成されています。

## 開発コマンド

### パッケージ管理
- `pnpm`を使用（pnpm-lock.yamlが存在）

### 基本開発
- `pnpm run dev` - Wranglerで開発サーバーを起動
- `pnpm run deploy` - 最小化してCloudflare Workersにデプロイ
- `pnpm run lint` - Biomeリンターとフォーマッターを実行（自動修正）
- `pnpm run test` - Vitestでテストを実行
- `pnpm run cf-typegen` - Cloudflare Worker設定からTypeScript型を生成

### コードスタイル
- リントとフォーマットにBiomeを使用
- タブインデント（biome.jsonで設定）
- JavaScript文字列にダブルクォート
- インポートの自動整理

## アーキテクチャ

### フレームワークスタック
- **ランタイム**: Cloudflare Workers
- **Webフレームワーク**: Hono（軽量Webフレームワーク）
- **言語**: TypeScript（strictモード）
- **テスト**: Vitest
- **ツール**: Wrangler（ローカル開発とデプロイ用）

### プロジェクト構造
- `src/index.ts` - Honoアプリのメインアプリケーションエントリーポイント
- `wrangler.jsonc` - Cloudflare Workers設定
- `biome.json` - リントとフォーマット設定
- `tsconfig.json` - ESNextモジュールでのTypeScript設定

### TypeScript設定
- ターゲット: バンドラーモジュール解決でESNext
- Hono JSXインポートソースでJSXサポート有効
- strictモード有効

### Cloudflare統合
- Cloudflareバインディング（KV、R2、D1、AI）を追加する際は、`wrangler.jsonc`を更新し`pnpm run cf-typegen`を実行
- 生成された`CloudflareBindings`型を使用: `new Hono<{ Bindings: CloudflareBindings }>()`

## コミットガイドライン

- Git コミットメッセージは日本語で書いてください。