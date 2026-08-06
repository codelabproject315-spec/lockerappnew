# ロッカー管理システム（Vercel版）

## ファイル構成

```
/
├── index.html        # フロントエンド（HTML/CSS/JS）
├── api/
│   ├── lockers.js    # GET  /api/lockers  - ロッカー一覧取得
│   ├── rent.js       # POST /api/rent     - 貸出
│   └── return.js     # POST /api/return   - 返却
├── vercel.json       # Vercel設定
└── package.json
```

## Vercelへのデプロイ手順

### 1. GitHubリポジトリにpush

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/locker-app.git
git push -u origin main
```

### 2. Vercelにインポート

1. [vercel.com](https://vercel.com) にログイン
2. 「Add New → Project」
3. GitHubリポジトリを選択してインポート

### 3. 環境変数を設定（重要！）

Vercelの「Settings → Environment Variables」で以下を追加：

| 変数名 | 値 |
|--------|-----|
| `AWS_DEFAULT_REGION` | `ap-northeast-1`（東京）など |
| `AWS_ACCESS_KEY_ID` | AWSのアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | AWSのシークレットキー |

### 4. デプロイ

「Deploy」ボタンを押すだけ！  
以降はGitHubにpushするたびに自動デプロイされます。

## 注意事項

- 管理者パスワードは `admin123`（必要に応じて変更してください）
- ロッカー情報は30秒ごとに自動更新されます
