# タグ検出アプリ

Figmaの初期デザインをベースにした、スマホ向けのリアルタイムタグ検出デモアプリです。
現状の検出はデモ用のモック実装ですが、カメラ取得、UI操作、オーバーレイ表示、Worker ベースの検出パイプライン整理までは反映済みです。将来的に WASM 検出器へ差し替えやすい構成にしています。

元のデザイン素材:
https://www.figma.com/design/xSEUrrSIayay4fRUtMSkyg/%E3%82%BF%E3%82%B0%E6%A4%9C%E5%87%BA%E3%82%A2%E3%83%97%E3%83%AA

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
- `actions/configure-pages` の `base_path` を使って `VITE_BASE_PATH` を注入するため、プロジェクト Pages でもアセットパスがずれません。
- `workflow_dispatch` にも対応しているため、Actions 画面から手動実行も可能です。

## 注意点

- カメラAPI（`getUserMedia`）は `https` もしくは `localhost` でのみ利用できます。
- 現在のタグ検出処理はデモ用途のモックです。
