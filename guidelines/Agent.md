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

### 検出アーキテクチャ（将来実装）
- **現状**: モックデータによるデモ動作
- **本番想定**:
  - 検出コア: WebAssembly (WASM) による高速処理
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
├── types/
│   └── detection.ts          # 型定義
└── components/
    ├── CameraView.tsx        # カメラ映像取得・Canvas描画
    ├── DetectionInfo.tsx     # 検出結果表示パネル
    ├── SettingsPanel.tsx     # タグ設定パネル
    └── ControlPanel.tsx      # 制御UI
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
}
```

## 将来の拡張予定

### WASM統合
- AprilTag C実装をEmscriptenでWASM化
- 実際の検出処理の実装
- パフォーマンス最適化

### 高度な機能
- 姿勢推定（6DoF）の表示
- 複数タグの同時追跡
- 検出履歴の保存
- カメラパラメータの調整UI（解像度、明るさ等）
- 検出精度の統計情報表示

### PWA対応
- Service Worker導入
- オフライン動作
- インストール可能なアプリ化

## 既知の制限事項

### 現在の状態
- ✅ カメラアクセスとプレビュー表示は完全動作
- ✅ UI/UX実装完了
- ⚠️ 検出処理はモックデータ（WASM統合待ち）

### ブラウザ要件
- HTTPS必須（またはlocalhost）
- カメラアクセス許可が必要
- モダンブラウザ必須（getUserMedia対応）

### パフォーマンス考慮事項
- スマホ性能に依存
- 実用化には解像度・フレームレート調整が必要
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

## 開発ステータス

### 完了済み
- ✅ 基本UI/UXの実装
- ✅ カメラアクセス機能
- ✅ 検出開始/停止制御
- ✅ タグタイプ・ファミリー選択UI
- ✅ 自動判定モード
- ✅ 検出結果のオーバーレイ表示
- ✅ モックデータでのデモ動作

### 次のステップ
- [ ] WASM検出器の統合
- [ ] Web Worker実装
- [ ] パフォーマンス最適化
- [ ] 実機テスト・調整
- [ ] GitHub Pages デプロイ設定
