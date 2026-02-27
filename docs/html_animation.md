# html_tailwind Animation

`html_tailwind` ビートにフレームベースのアニメーション機能を追加する仕組み。
CSS アニメーション（時間依存）ではなく、フレーム番号ベースの決定論的レンダリングにより、
Puppeteer で1フレームずつスクリーンショットを撮影し、FFmpeg で動画に結合する。

## Beat Schema

```json
{
  "duration": 3,
  "image": {
    "type": "html_tailwind",
    "html": ["<div id='title'>Hello</div>"],
    "script": ["function render(frame, totalFrames, fps) { ... }"],
    "animation": true
  }
}
```

### フィールド

| フィールド | 型 | 説明 |
|-----------|------|------|
| `html` | `string \| string[]` | HTML マークアップ（`<script>` を含めない） |
| `script` | `string \| string[]` | JavaScript コード（`<script>` タグ不要、テンプレートが自動で `<script>` ラップ） |
| `animation` | `true \| { fps: number }` | アニメーション有効化。省略時は静止画 |
| `duration` | `number` | ビートの長さ（秒）。アニメーション時は**必須** |

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
animation.animate('#title', { opacity: [0, 1] }, { start: 0, end: 0.5 });
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
  output: { outMin: 0, outMax: 1 }
})

// easing 付き（文字列名 or 関数）
interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
  easing: 'easeOut'
})

interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
  easing: Easing.easeOut
})
```

### Easing

```javascript
Easing.linear    // t → t
Easing.easeIn    // t → t²
Easing.easeOut   // t → 1 - (1-t)²
Easing.easeInOut // 前半加速・後半減速
```

### MulmoAnimation クラス

宣言的にアニメーションを定義できるヘルパー。`start`/`end` は秒単位。

```javascript
const animation = new MulmoAnimation();

// 単一要素のプロパティアニメーション
animation.animate('#title', { opacity: [0, 1], translateY: [30, 0] }, {
  start: 0, end: 0.5, easing: 'easeOut'
});

// 幅などの CSS プロパティ（第3要素で単位指定）
animation.animate('#bar', { width: [0, 80, '%'] }, { start: 0, end: 1.5 });

// 連番要素のスタガーアニメーション（セレクタに {i} プレースホルダ）
animation.stagger('#item{i}', 4, { opacity: [0, 1], translateX: [-40, 0] }, {
  start: 0, stagger: 0.4, duration: 0.5, easing: 'easeOut'
});

// タイプライターエフェクト
animation.typewriter('#text', 'Full text to reveal...', { start: 0, end: 3.4 });

// カウンターアニメーション
animation.counter('#label', [0, 100], {
  start: 0, end: 2, prefix: 'Progress: ', suffix: '%', decimals: 0
});

// コード行送り（行単位のタイプライター）
animation.codeReveal('#code', codeLines, { start: 0.3, end: 2.5 });

// 点滅（カーソルなど周期的な表示/非表示）
animation.blink('#cursor', { interval: 0.35 });
// interval: on/off 半サイクルの秒数（デフォルト 0.5）

// render() で毎フレーム更新（auto-render 使用時は省略可）
function render(frame, totalFrames, fps) {
  animation.update(frame, fps);
}
```

### プロパティ処理

| プロパティ | 処理 | デフォルト単位 |
|-----------|------|-------------|
| `translateX`, `translateY` | transform に結合 | px |
| `scale` | transform に結合 | なし |
| `rotate` | transform に結合 | deg |
| `opacity` | style.opacity | なし |
| CSS (`width`, `height` 等) | style[prop] | px（`[v1, v2, '%']` で変更可） |
| SVG (`r`, `cx`, `cy` 等) | setAttribute | なし |

### MulmoAnimation と interpolate の使い分け

| ケース | 推奨 |
|--------|------|
| フェードイン・移動・拡大などの定型アニメーション | `MulmoAnimation` |
| SVG パス生成、パーティクルなど複雑なロジック | `interpolate()` + 直接 DOM 操作 |
| 両方の組み合わせ | `MulmoAnimation` + `render()` 内で追加ロジック |

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

## 制約

- `animation` と `moviePrompt` の併用不可（同一ビートで両方指定するとエラー）
- `duration` は `animation` 使用時に**必須**（音声生成と画像生成が並列のため、事前にフレーム数を確定する必要がある）
- CSS animation / transition はテンプレートで無効化済み（`animation-play-state: paused`, `transition: none`）
