# feat: slide image block から imageRefs を参照

## Context

`imageParams.images` で定義された参照画像は、既存の `getImageRefs()` パイプラインでローカルファイルパスに解決される。
この仕組みは一切変更しない。

slide plugin の `imageRef` コンテンツブロック (`{ "type": "imageRef", "ref": "..." }`) で、解決済みの imageRefs をキー名で参照できるようにする。`image` の `src` に `ref:` プレフィクスをつける方式から、専用の `imageRef` タイプに変更。

## 変更しないもの

- `imageParams.images` のスキーマ・配置場所
- `getImageRefs()` の画像解決・生成プロセス

## 変更ファイル一覧

| File | Change |
|------|--------|
| `src/types/type.ts` | `ImageProcessorParams` に `imageRefs?` 追加 |
| `src/actions/images.ts` | graph の `imagePlugin` node に `imageRefs` を渡す |
| `src/actions/image_agents.ts` | `imagePluginAgent` で `imageRefs` を中継 |
| `src/methods/mulmo_media_source.ts` | `pathToDataUrl` を export |
| `src/utils/image_plugins/slide.ts` | `imageRef` → `image` 解決ロジック |
| `src/slide/schema.ts` | `imageRefBlockSchema` 追加 |
| `src/slide/blocks.ts` | `imageRef` プレースホルダー、`renderCardContentBlocks` 共通ヘルパー |
| `src/slide/index.ts` | `imageRefBlockSchema`, `ImageRefBlock` を re-export |
| `src/slide/layouts/columns.ts` | 共通ヘルパー使用に切替 |
| `src/slide/layouts/grid.ts` | 共通ヘルパー使用に切替 |
| `src/slide/layouts/comparison.ts` | items-stretch 追加、footer spacer 修正 |
| `src/slide/utils.ts` | cardWrap に min-h-0 overflow-hidden 追加 |
| `src/utils/html_render.ts` | file:// URL → 一時ファイル経由 page.goto |
| `README.md` | Content Block Types を 8 に更新 |
| `.claude/skills/slide/SKILL.md` | `imageRef` ドキュメント追加 |
| `plans/feat-slide-image-ref.md` | 本計画ファイル |
| `scripts/test/test_slide_image_ref.json` | ヒッグス粒子サンプル（imagePrompt + imageRef） |
| `scripts/test/test_slide_image_ref_en.json` | 英語版サンプル |
| `test/slide/test_image_ref.ts` | ユニットテスト |

## 実装詳細

### 1. `ImageProcessorParams` に `imageRefs` 追加 (`src/types/type.ts`)

optional で追加。既存プラグインに影響なし。

### 2. graph で `imageRefs` を `imagePlugin` に渡す (`src/actions/images.ts`)

`imagePlugin` node の inputs に `imageRefs: ":imageRefs"` 追加。

### 3. `imagePluginAgent` で中継 (`src/actions/image_agents.ts`)

受け取った `imageRefs` を `processorParams` に含めるだけ。

### 4. `pathToDataUrl` を export (`src/methods/mulmo_media_source.ts`)

`const` → `export const` に変更。

### 5. slide plugin で ref 解決 (`src/utils/image_plugins/slide.ts`)

- `collectContentArrays(slide)`: レイアウトから content 配列を収集
  - columns/comparison/grid/split/matrix → content あり
  - title/bigQuote/stats/timeline/table/funnel → なし
- `resolveSlideImageRefs(slide, imageRefs)`:
  1. JSON deep-clone
  2. `type: "imageRef"` ブロックを検出
  3. `imageRefs[block.ref]` → converter で URL に変換し、`type: "image"` ブロックに置換
  4. `alt`, `fit` はそのまま保持
- `processSlide`/`dumpHtml` で解決後のデータを `generateSlideHTML` に渡す

### 5b. slide schema に `imageRef` ブロック追加 (`src/slide/schema.ts`)

- `imageRefBlockSchema`: `{ type: "imageRef", ref: string, alt?: string, fit?: "contain"|"cover" }`
- `contentBlockSchema` の discriminatedUnion に追加
- `blocks.ts` にプレースホルダーレンダリング追加（未解決時の fallback）

### 6. サンプル (`scripts/test/test_slide_image_ref.json`)

`imageParams.images` に `imagePrompt` タイプで AI 生成画像を定義し、slide の `imageRef` ブロックから参照。ヒッグス粒子の解説プレゼン。英語版も `test_slide_image_ref_en.json` として用意。

### 7. テスト (`test/slide/test_image_ref.ts`)

- `imageRef` → `image` ブロックに解決（data URL）
- `image` ブロックの `src` は変更されない
- `alt`, `fit` が保持される
- 不明な ref key でエラー
- 各レイアウトの content 収集
- テスト後の temp file クリーンアップ

## 検証

```bash
yarn build && yarn lint && yarn ci_test
```
