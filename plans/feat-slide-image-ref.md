# feat: slide image block から imageRefs を参照

## Context

`imageParams.images` で定義された参照画像は、既存の `getImageRefs()` パイプラインでローカルファイルパスに解決される。
この仕組みは一切変更しない。

slide plugin の `imageRef` コンテンツブロック (`{ "type": "imageRef", "ref": "..." }`) で、解決済みの imageRefs をキー名で参照できるようにする。`image` の `src` に `ref:` プレフィクスをつける方式から、専用の `imageRef` タイプに変更。

## 変更しないもの

- `imageParams.images` のスキーマ・配置場所
- `getImageRefs()` の画像解決・生成プロセス
- `src/slide/` モジュール内部（standalone パッケージ化対応）

## 変更ファイル一覧

| File | Change |
|------|--------|
| `src/types/type.ts` | `ImageProcessorParams` に `imageRefs?` 追加 |
| `src/actions/images.ts` | graph の `imagePlugin` node に `imageRefs` を渡す |
| `src/actions/image_agents.ts` | `imagePluginAgent` で `imageRefs` を中継 |
| `src/methods/mulmo_media_source.ts` | `pathToDataUrl` を export |
| `src/utils/image_plugins/slide.ts` | ref 解決ロジック追加 |
| `plans/feat-slide-image-ref.md` | 本計画ファイル |
| `scripts/test/test_slide_image_ref.json` | サンプル MulmoScript |
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

既存の `scripts/test/image-2.png` を `imageParams.images` で参照画像として定義し、slide の image ブロックから `ref:` で使用。

### 7. テスト (`test/slide/test_image_ref.ts`)

- ref → data URL に解決される
- 非 ref の src はそのまま
- 不明な ref key でエラー
- 各レイアウトの content 収集

## 検証

```bash
yarn build && yarn lint && yarn ci_test
```
