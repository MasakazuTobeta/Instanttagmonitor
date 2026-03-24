JavaScript だけで、スマホのカメラからリアルタイムにエイプリルタグ検出するブラウザアプリは作れる？
はい、作れます。
ただし実用的にやるなら、UI とカメラ制御は JavaScript、検出コアは WebAssembly(WASM) にするのが現実的です。
AprilTag 3 の本家実装は C ライブラリで、検出速度改善や小さいタグの検出率向上、姿勢推定を備えています。実際にその C 実装を Emscripten で WASM 化して、ブラウザ上で AprilTag を検出する公開実装やデモが存在します。

ブラウザ側では、スマホカメラ映像は getUserMedia() で取得できます。これは現在の主要ブラウザで広く使えますが、HTTPS のような secure context が必須です。

構成はだいたいこうです。

getUserMedia({ video: { facingMode: "environment" } }) で背面カメラ取得
video を canvas に描画
フレームをグレースケール化して検出器へ渡す
検出結果の四隅・ID・姿勢をオーバーレイ描画
重い処理は Worker + OffscreenCanvas に逃がす
OffscreenCanvas は worker で使えるので、検出処理をメインスレッドから分離して UI の引っかかりを減らす構成が取れます。WASM もブラウザで高性能に動かせます。
実務上の結論はこうです。

「ブラウザアプリとして作れるか」
→ 作れます。スマホでも可能です。
「JavaScript だけで完全に純JS実装できるか」
→ 理論上はできますが、リアルタイム性はかなり厳しいです。特にスマホでは、純JSより WASM の方がずっと現実的です。
「スマホで実用速度が出るか」
→ 画質と処理量を落とせば十分狙えます。たとえば
入力解像度を 640x480 か 720p 程度に抑える
毎フレームではなく 2〜3 フレームに 1 回検出
Worker に逃がす
まずは ID 検出だけに絞る
という設計が定番です。これは上の WASM/worker 構成と相性がいいです。
一番大事なのは、「JSだけ」より「JSアプリ + WASM検出器」だと考えることです。
この形なら、PWA 化してスマホでそのまま使うところまで十分現実的です。
最小構成のイメージはこんな感じです。

const video = document.querySelector("video");

const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 640 },
    height: { ideal: 480 }
  }
});

video.srcObject = stream;
await video.play();

// あとは requestAnimationFrame で canvas に描画し、
// ImageData を WASM の apriltag detector に渡して結果を描画
要するに、
「純JSの検出器」なら厳しいが、「JavaScriptのブラウザアプリ」としてなら十分作れる。実用解は WASM 併用。


情報源
GitHub Pagesで公開して動かせる構成？
はい。GitHub Pages で公開して動かせる構成です。
理由はシンプルで、GitHub Pages は HTML/CSS/JavaScript などの静的サイトを配信する用途に向いていて、公開先は HTTPS で提供できます。GitHub Docs では Pages を静的サイトの公開方法として案内しており、サーバー処理なしの配信が前提です。

今回の用途は、

カメラ取得: getUserMedia()
画面描画: canvas
検出: JS / WASM
オーバーレイ描画: JS
のように、全部クライアント側で完結できます。
getUserMedia() は secure context でのみ利用可能なので HTTPS が必要ですが、GitHub Pages 側はその条件を満たしやすいです。
なので構成としてはこれで十分です。

index.html
main.js
detector.js
apriltag.wasm
必要なら worker.js
assets/
この形をそのまま GitHub Pages に載せれば動きます。
Node.js サーバーやバックエンドは不要です。GitHub Pages はサーバーサイドコード実行には向かない一方、こういう静的フロントエンドアプリには合っています。
注意点だけあります。

初回のカメラ許可が必要
ユーザー操作後にカメラ起動する実装にしておくと安定です。getUserMedia() は許可が必要です。
WASM ファイルの配信パス
GitHub Pages 配下で fetch("apriltag.wasm") の相対パスがずれないようにする必要があります。
SPA のパス設計
React/Vite などで作るときは、GitHub Pages 用に base path 設定が必要になることがあります。
素の HTML+JS ならほぼ問題ありません。
重い処理はスマホ性能依存
これは GitHub Pages の問題ではなく端末性能の問題です。
実用なら WASM + Worker + 低めの解像度 が無難です。
容量制限
GitHub Pages は公開サイトサイズや帯域に制限がありますが、AprilTag 検出アプリ程度なら普通は収まります。公開サイトは 1 GB 以下、帯域は 月 100 GB のソフト上限 です。
結論としては、
「GitHub Pages 上の静的Webアプリ + ブラウザ内WASM検出」 で普通にいけます。
むしろこの用途ではかなり相性がいいです。
おすすめ構成は Vanilla JS + WASM + Worker です。React なしでも十分作れます。



情報源
ページレイアウトをfigmaで作ってから静的サイト化は可能？
はい、可能です。
むしろ一般的な流れです。
Figma 側では、Dev Mode / Inspect で レイアウト・余白・色・タイポグラフィ・書き出し用アセットを確認でき、要素ごとの 自動生成コードスニペット も参照できます。CSS などのコード確認やアセット書き出しもできます。

ただし大事なのは、Figma からそのまま完成した実用HTMLサイトが自動で出てくるわけではないことです。
現実には、

Figmaで画面設計
Dev Modeで寸法・色・フォント・余白を確認
画像やSVGを書き出す
HTML/CSS/JavaScript に落とし込む
GitHub Pages に載せる
という流れになります。Figma のコード生成は「実装の補助」であって、そのまま本番品質のサイトを丸ごと生成するためのものではないと考えるのが正確です。Figma の公式案内でも、Dev Mode は設計をコードへ“変換しやすくする”ための開発者向けインターフェースとして説明されています。
今回みたいな スマホ向けカメラアプリ なら、特に相性がいいです。
Figmaで先に作ると、たとえばこういう部分を固めやすいです。

カメラ全画面プレビュー
上部ヘッダ
検出中インジケータ
タグID表示パネル
開始 / 停止ボタン
エラー時の案内UI
権限未許可時の説明画面
その上で静的サイト化すると、実装はこんな分担になります。
Figma担当: 見た目、余白、配色、アイコン、画面遷移
HTML/CSS担当: レイアウト再現
JavaScript担当: カメラ起動、WASM検出器呼び出し、オーバーレイ描画
つまり、見た目はFigma、機能はJavaScript です。
おすすめはこの進め方です。

Figmaで1画面作る
Auto Layout を使ってスマホ縦画面前提で整える
色・文字サイズ・余白をちゃんとトークン化する
アイコンやマーカー枠は SVG で書き出す
HTML/CSS に手で起こす
JavaScript でカメラと検出を載せる
GitHub Pages に配置する
注意点もあります。
Figmaデザインをピクセル単位でそのまま再現しようとしすぎると実装が重くなる
スマホ実機では、ブラウザUIやセーフエリアで見た目が少し変わる
カメラ画面はFigma通りでも、実際の映像アスペクト比で調整が必要
検出枠や結果表示は、静的デザインより実装都合を優先した方がよい
結論としては、
Figmaでページレイアウトを作ってから、静的サイトとしてHTML/CSS/JS化するのは普通に可能です。
しかも今回の用途だとかなりやりやすいです。
一番現実的なのは、FigmaはUI設計専用、実装はVanilla JS + CSS + WASM です。