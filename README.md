# タグ検出アプリ

Figmaの初期デザインをベースにした、スマホ向けのリアルタイムタグ検出デモアプリです。
現状は AssemblyScript で組んだ簡易 WASM 検出器を Worker 経由で動かし、失敗時は JS モックへフォールバックする構成です。カメラ取得、UI操作、オーバーレイ表示、検出パイプラインの土台までは反映済みで、次段階で本物の AprilTag デコーダへ差し替えやすいようにしています。

元のデザイン素材:
https://www.figma.com/design/xSEUrrSIayay4fRUtMSkyg/%E3%82%BF%E3%82%B0%E6%A4%9C%E5%87%BA%E3%82%A2%E3%83%97%E3%83%AA

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで表示後、カメラ権限を許可して動作確認できます。
WASM ソースを更新した場合は `npm run build:wasm` を先に実行すると反映できます。

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
- 現在の WASM 検出処理はコントラストベースの簡易実装で、実際の AprilTag 解析ではありません。
