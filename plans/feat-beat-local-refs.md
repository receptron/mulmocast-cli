# Phase 2: Beat-level local image/movie references

## Goal

Beat ごとに `images` を定義して、同じ beat 内の `html_tailwind` や `imagePrompt` で参照できるようにする。
また、`imagePrompt`/`moviePrompt` で生成した画像・動画を **reference image として** beat レベルの画像生成に使い、キャラクターや背景の一貫性を保つ。

## Agent 入力仕様（調査結果）

### 画像生成エージェント — `referenceImages: string[]`

| Agent | Provider | reference images の使い方 |
|-------|----------|--------------------------|
| imageGenAIAgent | Google | base64 encode → `inlineData` として `generateContent` に渡す |
| imageOpenaiAgent | OpenAI | `toFile` でストリーム化 → `openai.images.edit()` に渡す |
| imageReplicateAgent | Replicate | base64 encode → `image_input` として渡す |

→ 全て **画像ファイルパス配列** (`string[]`) を受け取る。**動画パスは渡せない。**

### 動画生成エージェント — `imagePath: string`

| Agent | Provider | reference image の使い方 |
|-------|----------|--------------------------|
| movieGenAIAgent | Google | `loadImageAsBase64(imagePath)` → `image` パラメータ（image-to-video） |
| movieReplicateAgent | Replicate | base64 encode → `start_image`/`first_frame_image`/`image`（image-to-video） |

→ 全て **画像ファイルパス1枚** (`string`) を受け取る。**動画は渡せない。**

### reference として渡せるもの一覧

| 生成対象 | reference に渡せるもの | 渡せないもの |
|---------|----------------------|-------------|
| 画像生成 (`imageGenerator`) | `imageRefs` の画像（複数可） | `movieRefs` の動画 |
| 動画生成 (`movieGenerator`) | `imageRefs` の画像（1枚） | `movieRefs` の動画 |
| html_tailwind / markdown | `imageRefs` (`image:name`) + `movieRefs` (`movie:name`) | — |

**結論**: `imageRefs`（画像パス）は全ての場面で使える万能 ref。`movieRefs`（動画パス）は html/markdown 内の `movie:name` でのみ使える。

## Current Flow (Phase 1 完了後)

```
imageParams.images (グローバル)
  ↓ getMediaRefs() — 全 type 一括解決
  ↓ → imageRefs: Record<string, string>  ← image, imagePrompt の結果
  ↓ → movieRefs: Record<string, string>  ← movie の結果
  ↓
graph.injectValue("imageRefs", imageRefs)
graph.injectValue("movieRefs", movieRefs)
  ↓
beat_graph_data (各 beat で)
  ├─ preprocessor: imageRefs → beat.imageNames フィルタ → referenceImages (string[])
  ├─ imageGenerator: referenceImages → images.edit / generateContent（キャラクター固定）
  ├─ movieGenerator: preprocessor.referenceImageForMovie → image-to-video
  └─ imagePlugin: imageRefs/movieRefs → html_tailwind 内の image:/movie: 解決
```

## Phase 2 設計

### 2-1. Schema: `beat.images` フィールド追加

```typescript
// schema.ts — mulmoBeatSchema に追加
images: mulmoImageParamsImagesSchema.optional()
```

`beat.images` は `imageParams.images` と同じスキーマ（`image`/`imagePrompt`/`movie`/`moviePrompt`）。

```json
{
  "beats": [{
    "images": {
      "bg": { "type": "imagePrompt", "prompt": "cherry blossom garden, bright daylight" },
      "pan": { "type": "moviePrompt", "prompt": "slow dolly forward", "imageName": "bg" }
    },
    "image": {
      "type": "html_tailwind",
      "html": ["<video src='movie:pan' autoplay muted style='width:100%;height:100%;object-fit:cover' />"]
    }
  }]
}
```

### 2-2. Beat-local refs の解決タイミング

**Problem**: beat.images の解決は、その beat の画像生成（imagePlugin/imageGenerator）より **前** に完了する必要がある。

**Solution**: `beat_graph_data` に新ノード `localRefs` を追加。preprocessor/imagePlugin の前に実行。

```
beat_graph_data:
  localRefs (new)  ← beat.images を解決 → mergedImageRefs, mergedMovieRefs を返す
    ↓
  preprocessor     ← mergedImageRefs から referenceImages を取得（画像のみ）
  imagePlugin      ← mergedImageRefs, mergedMovieRefs を html_tailwind/markdown に渡す
  imageGenerator   ← referenceImages（画像パスのみ）を AI に渡す
  movieGenerator   ← referenceImageForMovie（画像パス1枚）を AI に渡す
```

### 2-3. マージルール

- beat.images のキーがグローバル imageRefs/movieRefs と同名の場合、**beat ローカルが優先**
- `mergedImageRefs = { ...globalImageRefs, ...localImageRefs }`
- `mergedMovieRefs = { ...globalMovieRefs, ...localMovieRefs }`

### 2-4. 依存順序（2段階解決）

グローバルの `getMediaRefs` と同じ2段階方式:

1. **Stage 1**: `image`, `imagePrompt`, `movie` を並列解決
2. **Stage 2**: `moviePrompt` を解決（`imageName` で Stage 1 の imageRefs を参照可能）

`moviePrompt.imageName` は **imageRefs のみ参照可能**（動画生成に渡せるのは画像のみのため）。

### 2-5. Reference image の流れ

```
beat.images の imagePrompt → 画像生成 → localImageRefs[key] = "/path/to.png"
                                          ↓
                              mergedImageRefs に追加
                                          ↓
            ┌─────────────────────────────┼────────────────────────────┐
            ↓                             ↓                            ↓
  imageGenerator                  movieGenerator              html_tailwind
  (referenceImages)          (referenceImageForMovie)        (image:name 解決)
  画像パス配列 → AI            画像パス1枚 → AI             src → file:// 変換
  キャラクター固定              image-to-video                HTML 内埋め込み

beat.images の moviePrompt → 動画生成 → localMovieRefs[key] = "/path/to.mp4"
                                          ↓
                              mergedMovieRefs に追加
                                          ↓
                                    html_tailwind
                                   (movie:name 解決)
                                   src → file:// 変換
```

**Note**: `movieRefs` の動画パスは画像生成・動画生成の reference には使えない。html/markdown 内でのみ使用可能。

## Implementation Steps

### Step 1: Schema 変更

**File**: `src/types/schema.ts`

```diff
 export const mulmoBeatSchema = z.object({
+  images: mulmoImageParamsImagesSchema.optional(),
   // ... existing fields
 })
```

**File**: `src/types/type.ts` — 型は z.infer で自動導出されるため変更不要。

### Step 2: Beat-local refs 解決ロジック

**File**: `src/actions/image_references.ts`

新関数 `resolveBeatLocalRefs` を追加:

```typescript
export const resolveBeatLocalRefs = async (
  context: MulmoStudioContext,
  beat: MulmoBeat,
  index: number,
  globalImageRefs: Record<string, string>,
  globalMovieRefs: Record<string, string>,
): Promise<MediaRefs> => {
  const images = beat.images;
  if (!images) {
    return { imageRefs: globalImageRefs, movieRefs: globalMovieRefs };
  }

  const localImageRefs: Record<string, string> = {};
  const localMovieRefs: Record<string, string> = {};

  // Stage 1: image, imagePrompt, movie (parallel)
  await Promise.all(
    Object.keys(images).sort().map(async (key, i) => {
      const image = images[key];
      if (image.type === "imagePrompt") {
        localImageRefs[key] = await generateReferenceImage({
          context, key, index: index * 100 + i, image, force: false,
        });
      } else if (image.type === "image") {
        localImageRefs[key] = await MulmoMediaSourceMethods.imageReference(image.source, context, key);
      } else if (image.type === "movie") {
        localMovieRefs[key] = await resolveMovieReference(image, context, key);
      }
    }),
  );

  // Stage 2: moviePrompt (imageName references imageRefs only — not movieRefs)
  const combinedImageRefs = { ...globalImageRefs, ...localImageRefs };
  await Promise.all(
    Object.keys(images).sort().map(async (key, i) => {
      const image = images[key];
      if (image.type === "moviePrompt") {
        const imagePath = image.imageName ? combinedImageRefs[image.imageName] : undefined;
        localMovieRefs[key] = await generateReferenceMovie({
          context, key, index: index * 100 + i, moviePrompt: image, imagePath,
        });
      }
    }),
  );

  return {
    imageRefs: { ...globalImageRefs, ...localImageRefs },
    movieRefs: { ...globalMovieRefs, ...localMovieRefs },
  };
};
```

### Step 3: beat_graph_data に localRefs ノード追加

**File**: `src/actions/images.ts`

```diff
 beat_graph_data = {
   nodes: {
+    localRefs: {
+      agent: resolveBeatLocalRefsAgent,
+      inputs: {
+        context: ":context",
+        beat: ":beat",
+        index: ":__mapIndex",
+        imageRefs: ":imageRefs",
+        movieRefs: ":movieRefs",
+      },
+    },
     preprocessor: {
       agent: imagePreprocessAgent,
       inputs: {
         context: ":context",
         beat: ":beat",
         index: ":__mapIndex",
-        imageRefs: ":imageRefs",
-        movieRefs: ":movieRefs",
+        imageRefs: ":localRefs.imageRefs",
+        movieRefs: ":localRefs.movieRefs",
       },
     },
     imagePlugin: {
       inputs: {
-        imageRefs: ":imageRefs",
-        movieRefs: ":movieRefs",
+        imageRefs: ":localRefs.imageRefs",
+        movieRefs: ":localRefs.movieRefs",
       },
     },
```

`localRefs` が `beat.images` なしの場合はグローバル refs をそのまま返すので、既存動作に影響なし。

### Step 4: moviePrompt 解決（generateReferenceMovie）

**File**: `src/actions/image_references.ts`

`generateReferenceMovie` 関数を追加。グローバルの moviePrompt 対応（PR #1294）と同じロジック。
入力は `imagePath`（画像パス1枚）のみ — 動画パスは渡せない。

### Step 5: ドキュメント更新

**File**: `docs/image.md`
- `beat.images` セクション追加
- 使用例（imagePrompt + moviePrompt + html_tailwind）
- reference に渡せるものの制約を明記

### Step 6: テストスクリプト

**File**: `scripts/test/test_beat_local_refs.json`
- Beat 1: beat.images に imagePrompt → html_tailwind で `image:name` 参照
- Beat 2: beat.images に imagePrompt + moviePrompt(imageName) → html_tailwind で `movie:name` 参照
- Beat 3: グローバル + ローカル混在（同名キーでローカル優先の確認）
- Beat 4: beat.images の imagePrompt を `beat.imageNames` で reference image として imageGenerator に渡す

## Scope

- `beat.images` で `image`/`imagePrompt`/`movie`/`moviePrompt` を定義
- beat ローカルの refs がグローバル refs より優先（同名上書き）
- html_tailwind/markdown で `image:name`/`movie:name` として参照
- `beat.imageNames` で reference image として使用可能（画像のみ）
- `moviePrompt.imageName` は imageRefs のみ参照可能

## Out of scope

- lipSync 参照（別 issue）
- beat.images から別 beat の refs を参照するクロスリファレンス
- 動画パスを画像生成/動画生成の reference に渡す（API が未対応）
