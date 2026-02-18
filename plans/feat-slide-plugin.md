# feat: slide image plugin

## Overview

構造化 JSON データからスライド画像を生成するプラグイン。Tailwind CSS + Puppeteer で HTML → PNG 変換。11 種類のレイアウト、7 種類のコンテンツブロック、13 色のテーマカラーシステム。プロトタイプ (`/Users/isamu/ppt/`) で検証済み。

将来的に `mulmocast-slide` パッケージとして独立させることを考慮し、レンダリングロジックを `src/slide/` に自己完結させる。

## Data Model

各 beat の `image` フィールド:

```json
{
  "type": "slide",
  "theme": {
    "colors": { "bg": "0F172A", "bgCard": "1E293B", "primary": "3B82F6", ... },
    "fonts": { "title": "Georgia", "body": "Calibri", "mono": "Consolas" }
  },
  "slide": {
    "layout": "columns",
    "title": "Release Strategy",
    "columns": [{ "num": 1, "title": "Alpha", "content": [...] }, ...]
  }
}
```

## File Structure

```
src/slide/                        ← パッケージ切り出し可能な独立モジュール
  schema.ts                       ← Zod スキーマ + z.infer 型 export
  render.ts                       ← generateSlideHTML() メインエントリ
  blocks.ts                       ← renderContentBlock(): ContentBlock → HTML
  layouts/
    index.ts                      ← layoutMap: Record<layout, renderFn>
    title.ts                      ← layoutTitle()
    columns.ts                    ← layoutColumns()
    comparison.ts                 ← layoutComparison()
    grid.ts                       ← layoutGrid()
    big_quote.ts                  ← layoutBigQuote()
    stats.ts                      ← layoutStats()
    timeline.ts                   ← layoutTimeline()
    split.ts                      ← layoutSplit()
    matrix.ts                     ← layoutMatrix()
    table.ts                      ← layoutTable()
    funnel.ts                     ← layoutFunnel()
  utils.ts                        ← resolveColor(), escapeHtml(), wrapSlideShell()
  index.ts                        ← public API: { schema, generateSlideHTML, ... }

src/utils/image_plugins/
  slide.ts                        ← 薄いプラグインラッパー (import from ../../slide)

src/types/schema.ts               ← mulmoSlideMediaSchema を import して union に追加

test/slide/
  schema.test.ts                  ← Zod バリデーション (valid/invalid JSON)
  blocks.test.ts                  ← 各 content block の HTML 出力
  render.test.ts                  ← generateSlideHTML() 統合テスト
  layouts/
    title.test.ts
    columns.test.ts
    comparison.test.ts
    grid.test.ts
    big_quote.test.ts
    stats.test.ts
    timeline.test.ts
    split.test.ts
    matrix.test.ts
    table.test.ts
    funnel.test.ts
```

## Design: パッケージ独立性

`src/slide/` は以下の制約を守る:

- mulmocast-cli の他モジュールに **依存しない** (import は zod のみ)
- `renderHTMLToImage()` や Puppeteer に依存しない — pure な HTML 文字列を返す
- プラグイン側 (`image_plugins/slide.ts`) が `renderHTMLToImage()` を呼ぶ
- 将来 `mulmocast-slide` パッケージに切り出す際は `src/slide/` をそのまま移動

```
┌─────────────────────────┐     ┌──────────────────────┐
│  src/slide/ (pure)      │     │  image_plugins/      │
│                         │     │  slide.ts            │
│  schema.ts → Zod        │◄────│                      │
│  render.ts → HTML string│     │  process():          │
│  blocks.ts              │     │    html = generate..()│
│  layouts/*              │     │    renderHTMLToImage()│
│  utils.ts               │     │                      │
└─────────────────────────┘     └──────────────────────┘
```

## Implementation

### Step 1: `src/slide/schema.ts` — Zod スキーマ

layout ごとに厳密な Zod スキーマを定義。`z.discriminatedUnion("layout", [...])` で slide を型付け。

**export するもの:**
- 個別スキーマ: `titleSlideSchema`, `columnsSlideSchema`, ...
- union: `slideLayoutSchema` (discriminatedUnion)
- media: `mulmoSlideMediaSchema` (`{ type, theme, slide }`)
- 型: `z.infer<typeof ...>` で導出した TypeScript 型

### Step 2: `src/slide/utils.ts` — ユーティリティ

```typescript
export const resolveColor = (key: string, colors: ThemeColors): string => ...
export const escapeHtml = (s: string): string => ...
export const c = (key: string): string => ...  // Tailwind class helper: "primary" → "d-primary"
```

### Step 3: `src/slide/blocks.ts` — コンテンツブロック

```typescript
export const renderContentBlock = (block: ContentBlock): string => {
  switch (block.type) {
    case "text": ...
    case "bullets": ...
    case "code": ...
    case "callout": ...
    case "metric": ...
    case "divider": ...
    case "image": ...
  }
}

export const renderContentBlocks = (blocks: ContentBlock[]): string => ...
```

### Step 4: `src/slide/layouts/*.ts` — レイアウト関数

各ファイルが 1 つのレイアウト関数を export。

```typescript
// layouts/columns.ts
export const layoutColumns = (slide: ColumnsSlide): string => { ... }
```

全関数のシグネチャ: `(slide: XxxSlide) => string` (HTML snippet)

### Step 5: `src/slide/render.ts` — メインエントリ

```typescript
export const generateSlideHTML = (theme: Theme, slide: SlideLayout): string => {
  // 1. layout 関数でスライド本体の HTML を生成
  // 2. Tailwind config + カスタムカラー + フォント定義を含む完全な HTML を組み立て
  // 3. 完全な HTML 文字列を返す
}
```

### Step 6: `src/utils/image_plugins/slide.ts` — プラグインラッパー

```typescript
import { generateSlideHTML, mulmoSlideMediaSchema } from "../../slide/index.js";
import { renderHTMLToImage } from "../html_render.js";

export const imageType = "slide";

export const process = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  const html = generateSlideHTML(beat.image.theme, beat.image.slide);
  await renderHTMLToImage(html, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

export const html = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  return generateSlideHTML(beat.image.theme, beat.image.slide);
};

export const path = parrotingImagePath;
```

### Step 7: `src/types/schema.ts` — union に追加

```typescript
import { mulmoSlideMediaSchema } from "../slide/schema.js";

export const mulmoImageAssetSchema = z.union([
  ...,
  mulmoVisionMediaSchema,
  mulmoSlideMediaSchema,  // ← 追加
]);
```

### Step 8: `src/utils/image_plugins/index.ts` — 登録

```typescript
import * as pluginSlide from "./slide.js";
// imagePlugins 配列に pluginSlide を追加
```

## Testing Strategy

`node:test` + `node:assert` を使用。テスト名を読めば仕様が分かるように命名。

### `test/slide/schema.test.ts` — スキーマバリデーション

```
describe("slideLayoutSchema")
  ✓ accepts minimal title slide (layout + title only)
  ✓ accepts title slide with all optional fields
  ✓ accepts columns slide with 2 cards
  ✓ accepts columns slide with arrows and callout
  ✓ rejects slide with unknown layout
  ✓ rejects slide missing required title
  ✓ rejects theme with invalid hex color "ZZZZZZ"
  ✓ rejects content block with unknown type

describe("mulmoSlideMediaSchema")
  ✓ accepts complete slide media object
  ✓ rejects missing theme
  ✓ rejects missing slide
```

### `test/slide/blocks.test.ts` — コンテンツブロック HTML 出力

```
describe("renderContentBlock")
  describe("text")
    ✓ renders plain text in paragraph
    ✓ renders bold text with font-bold class
    ✓ renders dim text with muted color
    ✓ renders text with color accent
    ✓ renders centered text with text-center
    ✓ preserves newlines as <br>

  describe("bullets")
    ✓ renders unordered list with bullet markers
    ✓ renders ordered list with numbers
    ✓ renders custom icon bullets
    ✓ renders empty items array as empty list

  describe("code")
    ✓ renders code in monospace pre block
    ✓ escapes HTML entities in code

  describe("callout")
    ✓ renders default callout with background
    ✓ renders quote style with left border and italic
    ✓ renders info style with blue accent
    ✓ renders warning style with yellow accent
    ✓ renders callout with label

  describe("metric")
    ✓ renders large value and small label
    ✓ renders colored value
    ✓ renders positive change with green arrow
    ✓ renders negative change with red arrow

  describe("divider")
    ✓ renders horizontal line
    ✓ renders colored divider

  describe("image")
    ✓ renders img tag with src and alt
    ✓ defaults to object-contain fit
    ✓ renders cover fit
```

### `test/slide/layouts/*.test.ts` — レイアウトごと

各レイアウトで以下パターンをカバー:

- **最小構成**: 必須フィールドのみ
- **フル構成**: 全オプション指定
- **オプション省略**: 各オプションなし時の挙動
- **長文**: タイトルや本文が長い場合の折り返し
- **空配列**: items/columns/cells が空
- **多要素**: items が多い場合 (グリッド6個、タイムライン8個等)

例 — `test/slide/layouts/columns.test.ts`:

```
describe("layoutColumns")
  ✓ renders 2 columns side by side
  ✓ renders 3 columns with equal width
  ✓ renders 4 columns in narrow cards
  ✓ renders arrow separators when showArrows is true
  ✓ omits arrows when showArrows is false or undefined
  ✓ renders step label above title
  ✓ renders subtitle below title
  ✓ renders card with numbered badge
  ✓ renders card with icon
  ✓ renders card accent color as left border
  ✓ renders card with content blocks inside
  ✓ renders callout bar at bottom
  ✓ renders empty columns array without error
  ✓ handles long card title with word wrap
```

例 — `test/slide/layouts/matrix.test.ts`:

```
describe("layoutMatrix")
  ✓ renders 2x2 grid of cells
  ✓ renders 3x3 grid
  ✓ renders cell with accent color background
  ✓ renders cell items as bullet list
  ✓ renders cell with content blocks
  ✓ renders axis labels when xAxis/yAxis provided
  ✓ omits axis labels when not provided
  ✓ renders subtitle
```

### `test/slide/render.test.ts` — 統合テスト

```
describe("generateSlideHTML")
  ✓ returns complete HTML document with DOCTYPE
  ✓ includes Tailwind CDN script tag
  ✓ includes tailwind.config with theme colors
  ✓ includes font-family CSS for title, body, mono
  ✓ wraps slide content in full-viewport container
  ✓ applies slide-level bgColor override
  ✓ renders footer text when style.footer is set
  ✓ generates valid HTML for each of the 11 layouts
```

## Porting Source

プロトタイプ: `/Users/isamu/ppt/render_deck_html.cjs` (約700行) を分割して TypeScript 化。

## Reference

- プロトタイプ: `/Users/isamu/ppt/` (render_deck_html.cjs, type.ts, samples/)
- 既存サンプル: `/Users/isamu/ppt/samples/01-*.json` 〜 `14-*.json`
- mulmocast-vision パッケージ: `~/ss/llm/mulmocast-vision/` (独立パッケージの参考)
