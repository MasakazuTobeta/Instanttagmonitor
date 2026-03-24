# タグ検出アプリ

Figmaの初期デザインをベースにした、スマホ向けのリアルタイムタグ検出デモアプリです。
現在の検出はモック実装ですが、カメラ取得・UI操作・オーバーレイ表示まで動作します。

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで表示後、カメラ権限を許可して動作確認できます。

## ビルド

```bash
npm run build
npm run preview
```

## GitHub Pages 自動デプロイ

- `.github/workflows/deploy-pages.yml` により、`main` ブランチへ `push` されたタイミングで自動デプロイされます。
- 併せて `workflow_dispatch` にも対応しているため、Actions 画面から手動実行も可能です。
- ビルド時は `VITE_BASE_PATH=/<repo名>/` を使うため、リポジトリ名配下の Pages URL でも正しくアセットが読み込まれます。

## 注意点

- カメラAPI（`getUserMedia`）は `https` もしくは `localhost` でのみ利用できます。
- 現在のタグ検出処理はデモ用途のモックです。
