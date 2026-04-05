# Beds24 Revenue Dashboard

Beds24 の予約情報を Supabase に同期し、売上と直近予約をダッシュボード表示する Next.js 16 アプリです。

## セットアップ

1. 依存関係をインストールします

```bash
npm install
```

2. `.env.local.example` を元に `.env.local` を作成します

```bash
copy .env.local.example .env.local
```

3. 開発サーバーを起動します

```bash
npm run dev
```

## 必須環境変数

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BEDS24_API_KEY`

## 任意環境変数

- `BEDS24_SYNC_START_DATE`
- `BEDS24_SYNC_END_DATE`
- `BEDS24_WEBHOOK_SECRET`
- `BEDS24_SYNC_API_SECRET`

## エンドポイント

- `GET /api/webhooks/beds24?id=BOOKING_ID`
- `POST /api/webhooks/beds24`
- `GET /api/run-sync`
- `POST /api/run-sync`

`BEDS24_WEBHOOK_SECRET` または `BEDS24_SYNC_API_SECRET` を設定した場合は、`Authorization: Bearer <secret>`、`?secret=<secret>`、または対応ヘッダー経由で認証できます。

## 品質確認

```bash
npm run lint
npm run build
```
