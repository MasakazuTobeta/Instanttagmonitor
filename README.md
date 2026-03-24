# タグ検出アプリ

Figmaの初期デザインをベースにした、スマホ向けのリアルタイムタグ検出デモアプリです。
現状は Web Worker 上で AprilTag の実 WASM 検出器を動かし、カメラ映像から実際に `tag36h11` を検出できる構成です。UI、オーバーレイ、設定まわりはその検出器に接続済みで、他ファミリーや ArUco は次段階の対応対象です。

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
npm run verify:detector
```

`npm run verify:detector` は公式の `tag36h11` サンプル画像を使って、ローカルの WASM 検出器が `id: 0` を返すことを確認します。

## GitHub Pages 自動デプロイ

- `.github/workflows/deploy-pages.yml` により、`main` ブランチへ `push` されたタイミングで自動デプロイされます。
- `actions/configure-pages` の `base_path` を使って `VITE_BASE_PATH` を注入するため、プロジェクト Pages でもアセットパスがずれません。
- `workflow_dispatch` にも対応しているため、Actions 画面から手動実行も可能です。

## 注意点

- カメラAPI（`getUserMedia`）は `https` もしくは `localhost` でのみ利用できます。
- 現在の実検出は `tag36h11` のみ対応です。
- ArUco と他の AprilTag ファミリーは UI 上で選べますが、まだ実検出には未対応です。
