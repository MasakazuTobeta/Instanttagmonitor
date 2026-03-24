# タグ検出アプリ

Figmaの初期デザインをベースにした、スマホ向けのリアルタイムタグ検出デモアプリです。
現状は Web Worker 上で AprilTag の実 WASM 検出器を動かし、カメラ映像から複数の AprilTag family を実際に検出できる構成です。UI、オーバーレイ、設定まわりはその検出器に接続済みで、ArUco は次段階の対応対象です。
設定メニューからアプリ追加導線も利用でき、対応ブラウザではインストールプロンプト、iPhone / iPad では「ホーム画面に追加」の手順案内を出せます。

元のデザイン素材:
https://www.figma.com/design/xSEUrrSIayay4fRUtMSkyg/%E3%82%BF%E3%82%B0%E6%A4%9C%E5%87%BA%E3%82%A2%E3%83%97%E3%83%AA

## ローカル起動

```bash
npm install
npm run dev
npm run build:apriltag # official AprilTag C source から runtime を再生成する場合
```

ブラウザで表示後、カメラ権限を許可して動作確認できます。
AprilTag runtime を更新した場合は `npm run build:apriltag`、AssemblyScript プロトタイプを更新した場合は `npm run build:wasm` を先に実行すると反映できます。

## ビルド

```bash
npm run build
npm run preview
npm run verify:detector
```

`npm run verify:detector` は公式の `tag36h11 / tag25h9 / tag16h5 / tagCircle21h7 / tagCircle49h12 / tagStandard41h12 / tagStandard52h13` サンプル画像を使って、ローカルの WASM 検出器が各 family を返すことを確認します。

## GitHub Pages 自動デプロイ

- `.github/workflows/deploy-pages.yml` により、`main` ブランチへ `push` されたタイミングで自動デプロイされます。
- `actions/configure-pages` の `base_path` を使って `VITE_BASE_PATH` を注入するため、プロジェクト Pages でもアセットパスがずれません。
- `workflow_dispatch` にも対応しているため、Actions 画面から手動実行も可能です。

## 注意点

- カメラAPI（`getUserMedia`）は `https` もしくは `localhost` でのみ利用できます。
- 現在の実検出は AprilTag の複数 family に対応しています。
- ArUco は UI 上で選べますが、まだ実検出には未対応です。
- Android / Chromium 系ではアプリ内ボタンからインストールできますが、iOS / iPadOS はブラウザ共有メニューからの追加です。
