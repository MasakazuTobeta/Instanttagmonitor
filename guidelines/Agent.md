# AprilTag Detection Web Application - 要求仕様書

## プロジェクト概要

スマートフォンのカメラからリアルタイムにAprilTagを検出するブラウザベースのWebアプリケーション

### 目的
- GitHub Pagesで公開可能な静的Webアプリとして動作
- スマホカメラを使用したリアルタイムタグ検出
- 複数のタグタイプ・ファミリーに対応

## 技術仕様

### プラットフォーム
- **フレームワーク**: React + TypeScript
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **デプロイ**: GitHub Pages（静的サイト）

### カメラAPI
- `getUserMedia()` を使用してカメラ映像を取得
- 背面カメラ優先（`facingMode: "environment"`）
- 推奨解像度: 640x480 または 720p
- HTTPS必須（secure context）

### 検出アーキテクチャ
- **現状**: 実 WASM 検出器によるブラウザ検出
  - Web Worker 上で AprilTag WASM 検出器を実行
  - AprilTag の複数 family を実検出可能
  - パフォーマンスプロファイルに応じて解像度と検出間隔を切り替え可能
- **次段階**:
  - 検出コア: ArUco 対応と Worker 内前処理の強化
  - UI/カメラ制御: JavaScript
  - 非同期処理: Web Worker + OffscreenCanvas
  - フレームレート最適化: 2-3フレームに1回検出

## 機能要件

### 1. カメラ制御
- [x] カメラへのアクセス許可要求
- [x] リアルタイムプレビュー表示
- [x] 背面カメラの優先使用
- [x] エラーハンドリング（許可拒否時の案内）

### 2. 検出機能
- [x] 検出の開始/停止制御
- [x] リアルタイム検出状態の表示
- [x] 検出結果のオーバーレイ描画
  - 四隅の座標表示（緑色の枠線）
  - 各コーナーへのドット表示
  - タグID表示
  - タグタイプ表示

### 3. タグタイプ・ファミリー選択機能

#### 対応タグタイプ
1. **AprilTag** (オリジナル)
   - tag36h11
   - tag25h9
   - tag16h5
   - tagCircle21h7
   - tagCircle49h12
   - tagStandard41h12
   - tagStandard52h13

2. **AprilTag2**
   - tag36h11
   - tag25h9
   - tag16h5

3. **AprilTag3**
   - tag36h11
   - tag25h9
   - tag16h5

4. **ArUco**
   - DICT_4X4_50/100/250/1000
   - DICT_5X5_50/100/250/1000
   - DICT_6X6_50/100/250/1000
   - DICT_7X7_50/100/250/1000

#### 選択モード
- [x] **自動判定モード**（デフォルト）
  - すべてのタグタイプ・ファミリーを同時に検出
  - 検出結果にタイプとファミリー情報を付与
- [x] **手動選択モード**
  - 特定のタグタイプを指定
  - 特定のファミリーを指定（またはファミリーも自動判定）

### 4. UI/UX

#### レイアウト構成
- **カメラビュー**: 全画面プレビュー + Canvas オーバーレイ
- **検出情報パネル**（左上）:
  - 検出状態インジケータ
  - 検出数の表示
  - 各タグの詳細情報（ID、タイプ、ファミリー）
- **設定ボタン**（右上）:
  - タグタイプ・ファミリー選択UI
  - モーダル形式の設定パネル
- **コントロールパネル**（下部）:
  - 検出開始/停止ボタン
  - 使い方ガイド
  - デモモード注意書き

#### デザイン方針
- スマートフォン縦画面を前提
- ダークテーマベース（黒背景）
- 半透明パネル（backdrop-blur使用）
- 視認性の高い配色（緑色の検出枠、白文字）

## コンポーネント構成

```
/src/app/
├── App.tsx                    # メインアプリケーション
├── lib/
│   ├── mockDetection.ts      # 旧モック検出ロジック（現在はruntime未使用）
│   └── wasmDetector.ts       # 旧AssemblyScript検出器ラッパー
├── types/
│   └── detection.ts          # 型定義
├── workers/
│   └── detectorWorker.js     # Worker上の実 AprilTag WASM 検出
├── wasm/
│   └── contrastDetector.wasm # 旧AssemblyScriptプロトタイプ
└── components/
    ├── CameraView.tsx        # カメラ映像取得・Canvas描画
    ├── DetectionInfo.tsx     # 検出結果表示パネル
    ├── SettingsPanel.tsx     # タグ設定パネル
    └── ControlPanel.tsx      # 制御UI

/public/vendor/apriltag/
├── apriltag_wasm.js          # 実運用の WASM ランタイム
├── apriltag_wasm.wasm        # 実運用の検出器バイナリ
└── LICENSE                   # 同梱ライセンス

/src/wasm/
└── contrastDetector.ts       # 旧AssemblyScript 製の簡易検出器

/scripts/
├── build-wasm.mjs            # 旧AssemblyScript WASMバイナリ生成スクリプト
├── build-apriltag-runtime.mjs # official AprilTag C source から実 runtime を再生成
└── verify-apriltag-runtime.mjs # 公式サンプル画像で実検出を検証
```

### データフロー
1. `App.tsx` で検出設定と状態を管理
2. `SettingsPanel` で設定変更
3. `CameraView` でカメラ取得・検出・描画処理
4. `DetectionInfo` で結果表示
5. `ControlPanel` で検出制御

## データ型定義

```typescript
interface DetectionResult {
  id: number;
  corners: [number, number][];
  tagType?: string;      // 'AprilTag' | 'AprilTag2' | 'AprilTag3' | 'ArUco'
  family?: string;       // e.g. 'tag36h11', 'DICT_4X4_50'
}

interface DetectionSettings {
  tagType: TagType | 'auto';
  family: string | 'auto';
  performanceProfile: PerformanceProfile;
}
```

## 将来の拡張予定

### WASM統合
- OffscreenCanvas / Worker 内前処理への移行
- パフォーマンス最適化
- ArUco 対応

### 高度な機能
- 姿勢推定（6DoF）の表示
- 複数タグの同時追跡
- 検出履歴の保存
- カメラパラメータの調整UI（解像度、明るさ等）
- 検出精度の統計情報表示

### PWA対応
- Service Worker導入
- オフライン動作の基盤整備
- 設定メニューからのインストール導線追加

## 既知の制限事項

### 現在の状態
- ✅ カメラアクセスとプレビュー表示は完全動作
- ✅ UI/UX実装完了
- ✅ Worker ベースの WASM 検出パイプライン実装済み
- ✅ AprilTag 複数 family の実検出を実装済み
- ✅ 公式サンプル画像による multi-family ローカル検証スクリプトを追加
- ✅ PWA manifest / Service Worker / ホーム画面追加導線を実装済み
- ✅ GitHub Pages workflow / deploy 設定完了
- ✅ パフォーマンスプロファイルによる基本最適化を実装済み
- ⚠️ ArUco はまだ実検出未対応

### ブラウザ要件
- HTTPS必須（またはlocalhost）
- カメラアクセス許可が必要
- モダンブラウザ必須（getUserMedia対応）

### パフォーマンス考慮事項
- スマホ性能に依存
- 基本的な解像度・検出間隔の切り替えは実装済み
- フレームのグレースケール化はまだメインスレッド側で実施
- AprilTag family 拡張は完了、ArUco と Worker 内前処理は未着手
- 実用化には実機ベースの追加チューニングが必要
- Worker分離による最適化が推奨

## 参考情報

### 元ドキュメント
- `/src/imports/pasted_text/realtime-apriltag-detection.md`
  - JavaScript + WASM構成の実現可能性
  - GitHub Pagesでの公開方法
  - Figmaからの静的サイト化フロー

### 技術スタック選定理由
- **React**: コンポーネント志向、状態管理の容易さ
- **TypeScript**: 型安全性、開発効率向上
- **Tailwind CSS**: 高速なUI実装、レスポンシブ対応
- **getUserMedia**: 標準Web API、広範なブラウザサポート
- **Canvas**: 低レベル描画制御、オーバーレイ表示に最適

## GitHub運用メモ

### GitHub操作の基本方針
- GitHub Actions / PR / Issue / repository状態の確認は `gh` CLI を優先する
- ローカルの履歴操作や作業ツリー管理は `git` を使う

### よく使うコマンド
- `gh run list`
- `gh run view <run-id>`
- `gh run view <run-id> --log-failed`
- `gh run watch <run-id>`
- `gh pr view`
- `gh pr create`

## 開発ステータス

### 完了済み
- ✅ 基本UI/UXの実装
- ✅ カメラアクセス機能
- ✅ 検出開始/停止制御
- ✅ タグタイプ・ファミリー選択UI
- ✅ 自動判定モード
- ✅ 検出結果のオーバーレイ表示
- ✅ Web Workerベースの検出パイプライン整理
- ✅ 実 AprilTag WASM 検出器の統合
- ✅ AprilTag 複数 family 実検出のローカル検証
- ✅ PWA install 導線とホーム画面追加対応
- ✅ GitHub Pages デプロイ設定と本番デプロイ確認
- ✅ パフォーマンスプロファイルによる基本最適化

### 次のステップ
- [ ] ArUco 対応
- [ ] Worker 内へ前処理を寄せてメインスレッド負荷を削減
- [ ] 実機テスト・調整
- [ ] 実機ベースの追加パフォーマンスチューニング
- [ ] PWA のキャッシュ戦略と更新導線の改善
- [ ] Node 24系ランナー移行を見据えた Actions 更新
