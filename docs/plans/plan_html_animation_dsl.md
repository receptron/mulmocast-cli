# Plan: MulmoAnim ヘルパークラスの実装 (B案)

## Context

html_tailwind アニメーションの `render()` 関数が冗長で LLM がワンショット生成しにくい。ランタイムに `MulmoAnim` クラスを注入し、宣言的にアニメーション記述できるようにする (Issue #1240 B案)。

## 前提条件

PR #1238 (`refactor/html-animation-readability`) と PR #1239 (`feat/html-tailwind-script-field`) を先に main にマージする。その後 main から `feat/html-animation-dsl` ブランチを作成して実装。

## テンプレート再構成 (`tailwind_animated.html`)

**問題**: `${user_script}` がヘルパーより前に実行されると `new MulmoAnim()` が失敗する

**解決**: 3ブロック分割:

```html
<body>
  ${html_body}

  <script>
    // interpolate, Easing, interpolateWithEasing（既存）
    // MulmoAnim クラス（新規）
    // window.__MULMO
  </script>

  ${user_script}          ← ヘルパーの後 → MulmoAnim 使用可能

  <script>
    // Initial render(0, ...) call
  </script>
</body>
```

## MulmoAnim API (start/end は秒単位)

```javascript
var a = new MulmoAnim();
a.animate('#title', { opacity: [0, 1], translateY: [30, 0] }, { start: 0, end: 0.5, easing: 'easeOut' });
a.animate('#bar', { width: [0, 80, '%'] }, { start: 0, end: 1.5 });
a.stagger('#item{i}', 4, { opacity: [0, 1], translateX: [-40, 0] }, { start: 0, stagger: 0.4, duration: 0.5, easing: 'easeOut' });
a.typewriter('#text', 'Full text...', { start: 0, end: 3.4 });
a.counter('#label', [0, 100], { start: 0, end: 2, prefix: 'Progress: ', suffix: '%' });
function render(frame, totalFrames, fps) { a.update(frame, fps); }
```

### プロパティ処理

| プロパティ | 処理 | 単位 |
|-----------|------|------|
| `translateX/Y` | transform に結合 | px |
| `scale` | transform に結合 | なし |
| `rotate` | transform に結合 | deg |
| `opacity` | style.opacity | なし |
| CSS (`width` 等) | style[prop] | デフォルト px、`[v1,v2,'%']` で変更可 |
| SVG (`r`,`cx` 等) | setAttribute | なし |

## テストビート変換 (5/16)

| Beat | 変換 |
|------|------|
| `intro_title` | animate() x3 |
| `demo_fade_in` | animate() x1 |
| progress_bars | animate() x3 + counter() |
| typewriter | typewriter() + 生 JS カーソル点滅 |
| stagger_items | stagger() x1 |

残り11ビートは旧形式維持（SVG/particle/教育用デモ）。

## 変更ファイル

| File | Change |
|------|--------|
| `assets/html/tailwind_animated.html` | 3分割 + MulmoAnim クラス注入 |
| `src/utils/image_plugins/html_tailwind.ts` | (マージ済み状態、追加変更なし見込み) |
| `scripts/test/test_html_animation.json` | 5ビートを MulmoAnim 形式に変換 |

## 検証

```bash
yarn format && yarn lint && yarn build
yarn ci_test
```
