# html_tailwind Animation

`html_tailwind` ビートにフレームベースのアニメーション機能を追加する仕組み。
CSS アニメーション（時間依存）ではなく、フレーム番号ベースの決定論的レンダリングにより、
Puppeteer で1フレームずつスクリーンショットを撮影し、FFmpeg で動画に結合する。

## Beat Schema

```json
{
  "image": {
    "type": "html_tailwind",
    "html": ["<div id='title'>Hello</div>"],
    "script": ["function render(frame, totalFrames, fps) { ... }"],
    "animation": true
  }
}
```

### フィールド

| フィールド  | 型                        | 説明                                                                                         |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `html`      | `string \| string[]`      | HTML マークアップ（`<script>` を含めない）                                                   |
| `script`    | `string \| string[]`      | JavaScript コード（`<script>` タグ不要、テンプレートが自動で `<script>` ラップ）             |
| `animation` | `true \| { fps: number }` | アニメーション有効化。省略時は静止画                                                         |
| `duration`  | `number`                  | ビートの長さ（秒）。**原則不要**（音声から自動算出）。無音ビートや固定長が必要な場合のみ指定 |

### FPS 設定

- `"animation": true` → デフォルト 30fps
- `"animation": { "fps": 15 }` → カスタム fps（低 fps = 高速レンダリング）

### totalFrames の計算

```
totalFrames = Math.floor(duration * fps)
```

## テンプレート構造

`assets/html/tailwind_animated.html` は3ブロック構成:

```
<body>
  ${html_body}           ← beat.image.html

  <script>
    Easing               ← イージング関数
    interpolate()        ← 補間ヘルパー
    MulmoAnimation       ← 宣言的アニメーションクラス
    window.__MULMO       ← フレーム状態
  </script>

  ${user_script}         ← beat.image.script（ヘルパーの後 → MulmoAnimation 使用可能）

  <script>
    auto-render 検出     ← animation 変数があり render() 未定義なら自動生成
    render(0, ...)       ← 初期レンダリング
  </script>
</body>
```

## ランタイム API

### render() 関数

ユーザーが `script` フィールドで定義する。各フレームで呼び出される。

```javascript
function render(frame, totalFrames, fps) {
  // frame: 0-based のフレーム番号
  // totalFrames: 総フレーム数
  // fps: フレームレート
}
```

同期・非同期どちらでも可。

### Auto-render

`animation` という名前の `MulmoAnimation` インスタンスが存在し、`render()` 関数が定義されていない場合、
テンプレートが自動的に `render()` を生成する。

```javascript
// この場合 render() は不要 — auto-render が自動生成
const animation = new MulmoAnimation();
animation.animate("#title", { opacity: [0, 1] }, { start: 0, end: 0.5 });
// → 内部で自動的に: window.render = function(frame, totalFrames, fps) { animation.update(frame, fps); };
```

MulmoAnimation のみで完結するビートでは `function render(...)` のボイラープレートを省略できる。
カスタムロジック（interpolate 直接操作、SVG パス生成など）が必要な場合は従来通り `render()` を定義する。

### interpolate()

フレーム番号を値にマッピングする補間関数。クランプ付き。

```javascript
// 基本（linear）
interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
});

// easing 付き（文字列名 or 関数）
interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
  easing: "easeOut",
});

interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
  easing: Easing.easeOut,
});
```

### Easing

```javascript
Easing.linear; // t → t
Easing.easeIn; // t → t²
Easing.easeOut; // t → 1 - (1-t)²
Easing.easeInOut; // 前半加速・後半減速
```

### MulmoAnimation クラス

宣言的にアニメーションを定義できるヘルパー。`start`/`end` は秒単位。`end: 'auto'` でビート全体の長さを使用。

```javascript
const animation = new MulmoAnimation();

// 単一要素のプロパティアニメーション
animation.animate(
  "#title",
  { opacity: [0, 1], translateY: [30, 0] },
  {
    start: 0,
    end: 0.5,
    easing: "easeOut",
  },
);

// 幅などの CSS プロパティ（第3要素で単位指定）
animation.animate("#bar", { width: [0, 80, "%"] }, { start: 0, end: 1.5 });

// end: 'auto' — ビート全体の長さを end に使用
animation.animate("#crawl", { translateY: [720, -1100] }, { start: 0, end: "auto" });

// 連番要素のスタガーアニメーション（セレクタに {i} プレースホルダ）
animation.stagger(
  "#item{i}",
  4,
  { opacity: [0, 1], translateX: [-40, 0] },
  {
    start: 0,
    stagger: 0.4,
    duration: 0.5,
    easing: "easeOut",
  },
);

// タイプライターエフェクト
animation.typewriter("#text", "Full text to reveal...", { start: 0, end: 3.4 });

// カウンターアニメーション
animation.counter("#label", [0, 100], {
  start: 0,
  end: 2,
  prefix: "Progress: ",
  suffix: "%",
  decimals: 0,
});

// コード行送り（行単位のタイプライター）
animation.codeReveal("#code", codeLines, { start: 0.3, end: 2.5 });

// 点滅（カーソルなど周期的な表示/非表示）
animation.blink("#cursor", { interval: 0.35 });
// interval: on/off 半サイクルの秒数（デフォルト 0.5）

// Cover zoom（メディアを常に画面いっぱいに維持しつつズーム）
animation.coverZoom("#photo_img", {
  containerSelector: "#photo_wrap", // 省略時は親要素
  zoomFrom: 1.0,
  zoomTo: 1.5,
  // from/to は zoomFrom/zoomTo のエイリアスとしても使用可
  start: 0,
  end: "auto",
  easing: "linear",
});

// Cover pan（distance は入力上限なし、実移動は黒縁回避で自動 clamp）
// direction/distance の代わりに from/to も指定可能
// from/to は安全可動域で正規化される（0=片端, 50=中心, 100=反対端）
animation.coverPan("#photo_img", {
  containerSelector: "#photo_wrap", // 省略時は親要素
  axis: "x", // 'x' or 'y'
  from: 40, // 省略時 50
  to: 60, // 省略時 from
  zoom: 1.2, // cover 後の拡大率
  start: 0,
  end: "auto",
  easing: "linear",
});

// render() で毎フレーム更新（auto-render 使用時は省略可）
function render(frame, totalFrames, fps) {
  animation.update(frame, fps);
}
```

### プロパティ処理

| プロパティ                      | 処理                      | デフォルト単位                 |
| ------------------------------- | ------------------------- | ------------------------------ |
| `translateX`, `translateY`      | transform に結合          | px                             |
| `scale`                         | transform に結合          | なし                           |
| `rotate`                        | transform に結合          | deg                            |
| `rotateX`, `rotateY`, `rotateZ` | transform に結合 (3D回転) | deg                            |
| `opacity`                       | style.opacity             | なし                           |
| CSS (`width`, `height` 等)      | style[prop]               | px（`[v1, v2, '%']` で変更可） |
| SVG (`r`, `cx`, `cy` 等)        | setAttribute              | なし                           |

### Cover helpers

| API                         | 用途                   | 補足                                                                                                          |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `coverZoom(selector, opts)` | 画面を埋めたままズーム | `zoomFrom/zoomTo` を補間（`from/to` も可）                                                                    |
| `coverPan(selector, opts)`  | 画面を埋めたままパン   | `direction+distance` または `from/to`。`from/to` は安全可動域を 0..100 正規化（実移動は黒縁回避で自動 clamp） |

### MulmoAnimation と interpolate の使い分け

| ケース                                           | 推奨                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| フェードイン・移動・拡大などの定型アニメーション | `MulmoAnimation`                               |
| SVG パス生成、パーティクルなど複雑なロジック     | `interpolate()` + 直接 DOM 操作                |
| 両方の組み合わせ                                 | `MulmoAnimation` + `render()` 内で追加ロジック |

## 完全な例

### MulmoAnimation を使った宣言的パターン（auto-render）

```json
{
  "duration": 3,
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900'>",
      "  <h1 id='title' class='text-5xl font-bold text-white' style='opacity:0'>Hello</h1>",
      "  <div id='line' class='h-1 bg-cyan-400 mt-8 rounded' style='width:0'></div>",
      "</div>"
    ],
    "script": [
      "const animation = new MulmoAnimation();",
      "animation.animate('#title', { opacity: [0, 1], translateY: [30, 0] }, { start: 0, end: 0.5, easing: 'easeOut' });",
      "animation.animate('#line', { width: [0, 400, 'px'] }, { start: 0.5, end: 1.5, easing: 'easeInOut' });"
    ],
    "animation": true
  }
}
```

`render()` を定義していないが、`animation` 変数が `MulmoAnimation` インスタンスなので auto-render が機能する。

### interpolate を使った手動パターン

```json
{
  "duration": 3,
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex items-center justify-center bg-slate-900'>",
      "  <svg viewBox='0 0 400 400'>",
      "    <circle id='c' cx='200' cy='200' r='0' fill='none' stroke='#06b6d4' stroke-width='3' />",
      "  </svg>",
      "</div>"
    ],
    "script": [
      "function render(frame, totalFrames, fps) {",
      "  document.getElementById('c').setAttribute('r',",
      "    interpolate(frame, { input: { inMin: 0, inMax: totalFrames }, output: { outMin: 0, outMax: 150 }, easing: Easing.easeOut }));",
      "}"
    ],
    "animation": true
  }
}
```

## Data-attribute 宣言的アニメーション

HTML の `data-animation` 属性でアニメーションを宣言できる。JavaScript（`script` フィールド）を書く必要がない。

### 基本的な使い方

```json
{
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full w-full overflow-hidden relative bg-black'>",
      "  <img src='image:bg' data-animation='coverZoom' data-zoom-from='1.0' data-zoom-to='1.4' />",
      "  <div data-animation='animate' data-opacity='0,1' data-translate-y='30,0' data-start='0.3' style='color:white;font-size:72px'>Title</div>",
      "  <div data-animation='counter' data-from='0' data-to='7500' data-easing='easeOut' style='color:white;font-size:120px'>0</div>",
      "</div>"
    ],
    "animation": true
  }
}
```

`script` フィールドなし — data 属性だけでアニメーションが動く。

### 対応する data-animation 値

| data-animation | 主な data-\* 属性 | 説明 |
|----------------|-------------------|------|
| `animate` | `data-opacity`, `data-translate-x`, `data-translate-y`, `data-scale`, `data-rotate`, `data-rotate-x/y/z`, `data-width`, `data-height` | プロパティアニメーション。値は `"from,to"` 形式（例: `data-opacity="0,1"`）。単位指定は `"0,80,%"` |
| `stagger` | animate と同じ + `data-count`, `data-stagger`, `data-duration` | 連番要素のスタガーアニメーション |
| `counter` | `data-from`, `data-to`, `data-prefix`, `data-suffix`, `data-decimals` | カウンターアニメーション |
| `typewriter` | `data-text` | タイプライターエフェクト。`data-text` 省略時は要素の textContent を使用 |
| `codeReveal` | `data-lines` | コード行送り。`data-lines` は JSON 配列文字列 |
| `blink` | `data-interval` | 点滅（デフォルト 0.5秒） |
| `coverZoom` | `data-zoom-from`, `data-zoom-to`（または `data-from`, `data-to`） | 画面を埋めたままズーム |
| `coverPan` | `data-axis`, `data-direction`, `data-distance`, `data-from`, `data-to`, `data-zoom` | 画面を埋めたままパン |

### 共通属性

| 属性 | 説明 |
|------|------|
| `data-start` | 開始時刻（秒） |
| `data-end` | 終了時刻（秒）。省略時は `auto`（ビート全体） |
| `data-easing` | `linear`, `easeIn`, `easeOut`, `easeInOut` |
| `data-container` | coverZoom/coverPan のコンテナセレクタ |

### script との共存

`script` で `const animation = new MulmoAnimation()` を定義し、一部の要素に `data-animation` を指定すると、**data 属性のアニメーションが既存のインスタンスに追加される**。script で定義したアニメーションと data 属性のアニメーションが1つの `MulmoAnimation` インスタンスで共存する。

```json
{
  "html": [
    "<div class='h-full w-full relative bg-black'>",
    "  <div id='title' style='opacity:0;color:white;font-size:72px'>Script handles this</div>",
    "  <div data-animation='animate' data-opacity='0,1' data-start='1.0' style='color:yellow;font-size:48px'>Data-attr handles this</div>",
    "</div>"
  ],
  "script": [
    "const animation = new MulmoAnimation();",
    "animation.animate('#title', { opacity: [0, 1], translateY: [30, 0] }, { start: 0, end: 0.8, easing: 'easeOut' });"
  ],
  "animation": true
}
```

### 優先順位

1. `script` で `render()` 関数を定義 → render() が使われる（data 属性は無視されない — `animation` インスタンスがあれば追加される）
2. `script` で `animation` 変数を定義 + data 属性あり → data 属性が既存インスタンスに追加
3. data 属性のみ → 新しい `MulmoAnimation` インスタンスが自動生成
4. `script` も data 属性もなし → 静的レンダリング

### ID の自動生成

`data-animation` を持つ要素に `id` がない場合、自動的に `__mulmo_da_0`, `__mulmo_da_1`, ... が割り当てられる。明示的に `id` を指定するのが推奨。

## 制約

- `animation` と `moviePrompt` の併用不可（同一ビートで両方指定するとエラー）
- `duration` は**原則不要**（音声の長さから自動算出される）。明示的に設定すると音声と映像がずれる原因になるため、無音ビートや固定長が必要な場合のみ指定すること
- `end: 'auto'` を指定すると、ビート全体の長さ（`totalFrames / fps`）が `end` として使用される。ビート全体にわたるアニメーション（スクロールなど）に便利
- CSS animation / transition はテンプレートで無効化済み（`animation-play-state: paused`, `transition: none`）
