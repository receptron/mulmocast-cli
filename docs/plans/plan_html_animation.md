# Plan: Frame-Based Animation for html_tailwind Beats

## Overview

Remotion スタイルのフレームベースアニメーションを `html_tailwind` ビートに導入する。
CSS アニメーション（時間依存）ではなく、フレーム番号を基準にした決定論的レンダリングにより、
Puppeteer で1フレームずつスクリーンショットを撮影し、FFmpeg で動画に結合する。

### Why Frame-Based (not CSS Animation)

- CSS アニメーションは「時間経過」に依存
- Puppeteer のレンダラーは1フレームずつ静止画として撮る → CSS の時間ベースのアニメーションは正しく動かない
- フレーム番号ベースなら「フレーム30のときはこの見た目」と決定論的に決まる
- どんな速度でレンダリングしても正確な結果が得られる

## Schema Design

### `mulmoHtmlTailwindMediaSchema` の拡張

```typescript
// animation フィールドを追加
export const mulmoHtmlTailwindMediaSchema = z
  .object({
    type: z.literal("html_tailwind"),
    html: stringOrStringArray,
    animation: z.union([
      z.literal(true),           // shorthand: defaults (30fps, duration from beat)
      z.object({
        fps: z.number().min(1).max(60).optional().default(30),
      }),
    ]).optional(),               // undefined = static (current behavior)
  })
  .strict();
```

- `animation: true` → 30fps、duration は `beat.duration` から取得
- `animation: { fps: 15 }` → 15fps（レンダリング高速化用）
- `animation` なし → 現行通り静止画

### 制約: `moviePrompt` との併用は不可

`animation` 付き `html_tailwind` と `moviePrompt` を同じビートに指定した場合はエラーとする。

理由:
- `animation` では `imagePlugin` が `.mp4` を生成し `movieFile` に格納する
- `moviePrompt` では `movieGenerator` が AI 生成動画を同じ `movieFile` に書き込もうとする
- 両方が同一ファイルに書き込むため競合・上書きが発生する

```typescript
// imagePreprocessAgent 内でバリデーション
if (isAnimatedHtml && beat.moviePrompt) {
  throw new Error(
    "html_tailwind animation and moviePrompt cannot be used together on the same beat. " +
    "Use either animation or moviePrompt, not both."
  );
}
```

### Duration の決定

**`beat.duration` を必須とする。**

理由:
- 現在のパイプラインでは音声生成（`audio`）と画像生成（`images`）は **GraphAI で並列実行** される
- `studioBeat.duration` は音声生成後に設定されるが、画像プラグイン実行時点では未設定の可能性がある
- アニメーションのフレーム数は事前に確定していなければならない（全フレームを Puppeteer でキャプチャするため）
- したがって `beat.duration` の明示指定を必須とし、未指定ならエラーとする

```typescript
// plugin 内の duration 取得
const duration = beat.duration;
if (duration === undefined) {
  throw new Error(
    "html_tailwind animation requires explicit beat.duration. " +
    "Set duration in the beat definition."
  );
}
```

> **将来的な拡張**: 音声生成 → アニメーション生成の順序依存を GraphAI の依存グラフで表現すれば、
> `studioBeat.duration` からの自動取得も可能。ただし初期実装のスコープ外とする。

### totalFrames の計算ルール

```typescript
// floor を使い、duration を超えないことを保証
const totalFrames = Math.floor(duration * fps);
```

- `ceil` だと `totalFrames / fps > duration` となり、音声同期やトランジション境界でズレるリスクがある
- `floor` なら最終フレームは `(totalFrames - 1) / fps < duration` で必ず duration 以内
- 動画の実際の長さは `totalFrames / fps` で、`duration` との差は最大 `1/fps` 秒（30fps で約 33ms）
- FFmpeg 側で `tpad=stop_mode=clone` により不足分は最終フレームで埋められるため、音声とのズレは発生しない

## User API: HTML 内の記述方法

### MulmoCast が注入するグローバル変数

```javascript
window.__MULMO = {
  frame: 0,           // current frame number (0-based)
  totalFrames: 90,    // total frame count
  fps: 30,            // frames per second
};
```

### ユーザーが定義する `render()` 関数

HTML 内に `render(frame, totalFrames, fps)` 関数を定義する。
MulmoCast は各フレームでこの関数を呼び出し、スクリーンショットを撮る。

**`render()` は同期関数でも非同期関数（async）でも良い。**
MulmoCast 側で戻り値を `await` するため、Promise を返しても安全に処理される。

```html
<div id="title" class="text-6xl font-bold text-center mt-40 text-blue-600">
  Hello MulmoCast
</div>

<script>
function render(frame, totalFrames, fps) {
  const title = document.getElementById('title');

  // Fade in over the first 1 second (30 frames at 30fps)
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  title.style.opacity = opacity;

  // Slide up from 80px below
  const translateY = interpolate(frame, [0, 30], [80, 0]);
  title.style.transform = `translateY(${translateY}px)`;
}
</script>
```

非同期の例（画像読み込み等）:

```html
<script>
async function render(frame, totalFrames, fps) {
  // 非同期処理も安全に待機される
  if (frame === 0) {
    await loadSomeResource();
  }
  updateDOM(frame);
}
</script>
```

### MulmoCast が注入するヘルパー関数

```javascript
/**
 * Linear interpolation with clamping.
 * Similar to Remotion's interpolate().
 *
 * @param value - Current value (typically frame number)
 * @param inputRange - [start, end] of input
 * @param outputRange - [start, end] of output
 * @returns Interpolated and clamped value
 */
function interpolate(value, inputRange, outputRange) {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + progress * (outMax - outMin);
}

/**
 * Easing functions for non-linear interpolation.
 */
const Easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

/**
 * Interpolate with easing function.
 *
 * @param value - Current value (typically frame number)
 * @param inputRange - [start, end] of input
 * @param outputRange - [start, end] of output
 * @param easing - Easing function from Easing object
 */
function interpolateWithEasing(value, inputRange, outputRange, easing) {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + easing(progress) * (outMax - outMin);
}
```

### MulmoScript の記述例

```json
{
  "beats": [
    {
      "text": "",
      "duration": 3,
      "image": {
        "type": "html_tailwind",
        "html": [
          "<div id='title' class='text-6xl font-bold text-center mt-40 text-blue-600'>",
          "  Hello MulmoCast",
          "</div>",
          "<script>",
          "function render(frame, totalFrames, fps) {",
          "  const opacity = interpolate(frame, [0, 30], [0, 1]);",
          "  document.getElementById('title').style.opacity = opacity;",
          "}",
          "</script>"
        ],
        "animation": true
      }
    }
  ]
}
```

## Implementation

### Affected Files

| File | Change |
|------|--------|
| `src/types/schema.ts` | `mulmoHtmlTailwindMediaSchema` に `animation` フィールド追加 |
| `src/utils/html_render.ts` | `renderHTMLToFrames()` 新規追加 |
| `assets/html/tailwind_animated.html` | アニメーション用 HTML テンプレート新規作成 |
| `src/utils/image_plugins/html_tailwind.ts` | animation 検出 → フレームレンダリング → 動画生成 |
| `src/utils/file.ts` | `getBeatAnimatedVideoPath()` 新規追加 |
| `src/actions/image_agents.ts` | animated html_tailwind のパス解決を修正 |
| `src/actions/images.ts` | GraphAI グラフの output に animatedVideoFile を追加 |
| `test/` | ユニットテスト追加 |

### Step 1: Schema Extension

`src/types/schema.ts`:

```typescript
export const htmlTailwindAnimationSchema = z.union([
  z.literal(true),
  z.object({
    fps: z.number().min(1).max(60).optional().default(30),
  }),
]);

export const mulmoHtmlTailwindMediaSchema = z
  .object({
    type: z.literal("html_tailwind"),
    html: stringOrStringArray,
    animation: htmlTailwindAnimationSchema.optional(),
  })
  .strict();
```

### Step 2: File Path Utility

`src/utils/file.ts` に追加:

```typescript
/**
 * Get the video output path for animated html_tailwind beats.
 * Uses .mp4 extension instead of .png.
 */
export const getBeatAnimatedVideoPath = (context: MulmoStudioContext, index: number) => {
  const imageProjectDirPath = MulmoStudioContextMethods.getImageProjectDirPath(context);
  const beat = context.studio.script.beats[index];
  const filename = beat?.id ? `${beat.id}` : `${index}${imageSuffix}`;
  return `${imageProjectDirPath}/${filename}_animated.mp4`;
};
```

これにより `.png` パスとは独立した `.mp4` パスが得られ、`movieFile` に `.png` が入る問題を回避する。

### Step 3: Animated HTML Template

`assets/html/tailwind_animated.html`:

既存の `tailwind.html` をベースに以下を変更:
- ヘルパー関数 (`interpolate`, `Easing`, `interpolateWithEasing`) を追加
- `window.__MULMO` グローバル変数のセットアップ
- CSS アニメーション/トランジションを明示的に無効化
- **Mermaid / Chart.js CDN は含めない**

> **Mermaid / Chart.js 非対応の理由と方針**:
> アニメーション用テンプレートでは、フレームレンダリングのパフォーマンスを
> 優先するため CDN の読み込みを省略する。
> Mermaid や Chart.js のアニメーション付きビートが必要になった場合は、
> 既存の `tailwind.html` テンプレートに animation ヘルパーを追加した
> 統合テンプレートを別途作成する（現時点ではスコープ外）。

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Disable all CSS animations/transitions for deterministic rendering */
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
    }
    ${custom_style}
  </style>
</head>
<body class="bg-white text-gray-800 h-full flex flex-col">
  ${html_body}

  <script>
    // === MulmoCast Animation Helpers ===
    function interpolate(value, inputRange, outputRange) {
      const [inMin, inMax] = inputRange;
      const [outMin, outMax] = outputRange;
      const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
      return outMin + progress * (outMax - outMin);
    }

    const Easing = {
      linear: (t) => t,
      easeIn: (t) => t * t,
      easeOut: (t) => 1 - (1 - t) * (1 - t),
      easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    };

    function interpolateWithEasing(value, inputRange, outputRange, easing) {
      const [inMin, inMax] = inputRange;
      const [outMin, outMax] = outputRange;
      const progress = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
      return outMin + easing(progress) * (outMax - outMin);
    }

    // === MulmoCast Frame State (updated by Puppeteer per frame) ===
    window.__MULMO = {
      frame: 0,
      totalFrames: ${totalFrames},
      fps: ${fps},
    };

    // Initial render (frame 0)
    if (typeof render === 'function') {
      render(0, window.__MULMO.totalFrames, window.__MULMO.fps);
    }
  </script>
</body>
</html>
```

### Step 4: Frame Rendering Engine

`src/utils/html_render.ts` に `renderHTMLToFrames()` を追加:

```typescript
/**
 * Render an animated HTML page frame-by-frame using Puppeteer.
 *
 * For each frame:
 *   1. Update window.__MULMO.frame
 *   2. Call render(frame, totalFrames, fps) — awaits if it returns a Promise
 *   3. Take a screenshot
 *
 * The render() function may be sync or async.
 */
export const renderHTMLToFrames = async (
  html: string,
  outputDir: string,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
  onProgress?: (frame: number, total: number) => void,
): Promise<string[]> => {
  const browser = await puppeteer.launch({
    args: isCI
      ? ["--no-sandbox", "--allow-file-access-from-files"]
      : ["--allow-file-access-from-files"],
  });
  const page = await browser.newPage();

  // Wait for Tailwind CSS CDN to load
  await loadHtmlIntoPage(page, html, 30000);
  await page.setViewport({ width, height });
  await page.addStyleTag({
    content: "html{height:100%;margin:0;padding:0;overflow:hidden}"
  });

  // Scale content to fit viewport (same logic as renderHTMLToImage)
  await page.evaluate(
    ({ viewportWidth, viewportHeight }) => {
      const docElement = document.documentElement;
      const scrollWidth = Math.max(docElement.scrollWidth, document.body.scrollWidth || 0);
      const scrollHeight = Math.max(docElement.scrollHeight, document.body.scrollHeight || 0);
      const scale = Math.min(
        viewportWidth / (scrollWidth || viewportWidth),
        viewportHeight / (scrollHeight || viewportHeight),
        1
      );
      docElement.style.overflow = "hidden";
      (document.body as HTMLElement).style.zoom = String(scale);
    },
    { viewportWidth: width, viewportHeight: height },
  );

  const framePaths: string[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    // Update frame state and call render() — await in case it returns a Promise
    await page.evaluate(
      async ({ f, total, fpsVal }) => {
        const w = window as any;
        w.__MULMO.frame = f;
        if (typeof w.render === "function") {
          await w.render(f, total, fpsVal);
        }
      },
      { f: frame, total: totalFrames, fpsVal: fps },
    );

    const framePath = nodePath.join(outputDir, `frame_${String(frame).padStart(5, "0")}.png`);
    await page.screenshot({ path: framePath as `${string}.png` });
    framePaths.push(framePath);

    if (onProgress) {
      onProgress(frame + 1, totalFrames);
    }
  }

  await browser.close();
  return framePaths;
};
```

### Step 5: Frame Sequence → Video Conversion

`src/utils/ffmpeg_utils.ts` に追加（既存の fluent-ffmpeg import を活用）:

```typescript
/**
 * Convert a sequence of PNG frames into a video file.
 * Expects files named frame_00000.png, frame_00001.png, etc.
 */
export const framesToVideo = async (
  framesDir: string,
  outputPath: string,
  fps: number,
  width: number,
  height: number,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`${framesDir}/frame_%05d.png`)
      .inputOptions([`-framerate ${fps}`])
      .outputOptions([
        `-c:v libx264`,
        `-pix_fmt yuv420p`,
        `-r ${fps}`,
        `-s ${width}x${height}`,
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
};
```

### Step 6: html_tailwind Plugin Modification

`src/utils/image_plugins/html_tailwind.ts`:

```typescript
import fs from "node:fs";
import { ImageProcessorParams } from "../../types/index.js";
import { getHTMLFile } from "../file.js";
import { renderHTMLToImage, interpolate, renderHTMLToFrames } from "../html_render.js";
import { framesToVideo } from "../ffmpeg_utils.js";
import { parrotingImagePath } from "./utils.js";

export const imageType = "html_tailwind";

const getAnimationConfig = (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return null;
  const animation = beat.image.animation;
  if (animation === undefined) return null;
  if (animation === true) return { fps: 30 };
  return { fps: animation.fps ?? 30 };
};

const processHtmlTailwindAnimated = async (params: ImageProcessorParams) => {
  const { beat, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const animConfig = getAnimationConfig(params);
  if (!animConfig) return;

  // Duration must be explicitly set for animated beats
  const duration = beat.duration;
  if (duration === undefined) {
    throw new Error(
      "html_tailwind animation requires explicit beat.duration. " +
      "Set duration in the beat definition."
    );
  }

  const fps = animConfig.fps;
  const totalFrames = Math.floor(duration * fps);
  if (totalFrames <= 0) {
    throw new Error(
      `html_tailwind animation: totalFrames is ${totalFrames} ` +
      `(duration=${duration}, fps=${fps}). Increase duration or fps.`
    );
  }

  const html = Array.isArray(beat.image.html)
    ? beat.image.html.join("\n")
    : beat.image.html;
  const template = getHTMLFile("tailwind_animated");
  const htmlData = interpolate(template, {
    html_body: html,
    totalFrames: String(totalFrames),
    fps: String(fps),
    custom_style: "",
  });

  // Determine output video path from params.imagePath
  // imagePath is set to the .mp4 path by imagePreprocessAgent (via getBeatAnimatedVideoPath)
  const videoPath = params.imagePath;

  // Create frames directory next to the video file
  const framesDir = videoPath.replace(/\.[^/.]+$/, "_frames");
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    // Render all frames
    await renderHTMLToFrames(
      htmlData, framesDir,
      canvasSize.width, canvasSize.height,
      totalFrames, fps,
    );

    // Convert frames to video
    await framesToVideo(framesDir, videoPath, fps, canvasSize.width, canvasSize.height);
  } finally {
    // Clean up frames directory
    fs.rmSync(framesDir, { recursive: true, force: true });
  }

  return videoPath;
};

const processHtmlTailwindStatic = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const html = Array.isArray(beat.image.html)
    ? beat.image.html.join("\n")
    : beat.image.html;
  const template = getHTMLFile("tailwind");
  const htmlData = interpolate(template, {
    html_body: html,
  });
  await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height);
  return imagePath;
};

const processHtmlTailwind = async (params: ImageProcessorParams) => {
  const animConfig = getAnimationConfig(params);
  if (animConfig) {
    return processHtmlTailwindAnimated(params);
  }
  return processHtmlTailwindStatic(params);
};

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;
  return Array.isArray(beat.image.html) ? beat.image.html.join("\n") : beat.image.html;
};

export const process = processHtmlTailwind;
export const path = parrotingImagePath;
export const html = dumpHtml;
```

### Step 7: Pipeline Integration (Critical)

#### 問題の背景

現在のパイプラインでは:
1. `imagePreprocessAgent` がファイルパスを決定（`imagePath`, `movieFile` 等）
2. `imagePluginAgent` が `plugin.process()` を実行するが、**戻り値は使わない**
3. `output` ノードが `preprocessor` の結果をそのまま `studioBeat` にコピーする

つまり、**ファイルパスの決定権は `imagePreprocessAgent` にある**。
plugin が `.mp4` を生成しても、preprocessor が `.png` パスを `movieFile` に設定していたら壊れる。

#### `src/actions/image_agents.ts` の修正

```typescript
import { getBeatAnimatedVideoPath } from "../utils/file.js";

export const imagePreprocessAgent = async (namedInputs: { ... }) => {
  // ... 既存コード ...

  if (beat.image) {
    const plugin = MulmoBeatMethods.getPlugin(beat);
    const pluginPath = plugin.path({ beat, context, imagePath, ...htmlStyle(context, beat) });

    const markdown = plugin.markdown ? plugin.markdown({ ... }) : undefined;
    const html = plugin.html ? await plugin.html({ ... }) : undefined;

    const isTypeMovie = beat.image.type === "movie";
    const isAnimatedHtml = beat.image.type === "html_tailwind"
      && (beat.image as any).animation !== undefined;

    // animation と moviePrompt の併用を禁止
    if (isAnimatedHtml && beat.moviePrompt) {
      throw new Error(
        "html_tailwind animation and moviePrompt cannot be used together on the same beat. " +
        "Use either animation or moviePrompt, not both."
      );
    }

    if (isAnimatedHtml) {
      // Animated html_tailwind: compute a dedicated .mp4 path
      const animatedVideoPath = getBeatAnimatedVideoPath(context, index);
      return {
        ...returnValue,
        // imagePath: plugin writes to animatedVideoPath, but we also need
        // a static image for thumbnails/preview. Use extractImageFromMovie.
        imagePath: imagePath,              // for thumbnail extraction
        movieFile: animatedVideoPath,      // .mp4 path for the pipeline
        imageFromMovie: true,              // triggers extractImageFromMovie
        referenceImageForMovie: pluginPath,
        markdown,
        html,
      };
    }

    return {
      ...returnValue,
      imagePath: isTypeMovie ? imagePath : pluginPath,
      movieFile: isTypeMovie ? pluginPath : returnValue.movieFile,
      imageFromMovie: isTypeMovie,
      referenceImageForMovie: pluginPath,
      markdown,
      html,
    };
  }
  // ... 既存コード ...
};
```

**ポイント**:
- `movieFile` に `getBeatAnimatedVideoPath()` の `.mp4` パスを設定（`.png` が入らない）
- `imageFromMovie: true` により `extractImageFromMovie` が動画からサムネイルを抽出
- `imagePath` は引き続き `.png`（サムネイル / PDF 用の静止画）

#### `imagePluginAgent` の修正

animated html_tailwind の場合、`plugin.process()` に渡す `imagePath` を
`.mp4` パスに差し替える必要がある:

```typescript
export const imagePluginAgent = async (namedInputs: {
  context: MulmoStudioContext;
  beat: MulmoBeat;
  index: number;
  imageRefs?: Record<string, string>;
}) => {
  const { context, beat, index, imageRefs } = namedInputs;
  const { imagePath } = getBeatPngImagePath(context, index);

  const plugin = MulmoBeatMethods.getPlugin(beat);

  // For animated html_tailwind, use the .mp4 path as imagePath
  const isAnimatedHtml = beat.image?.type === "html_tailwind"
    && (beat.image as any).animation !== undefined;
  const effectiveImagePath = isAnimatedHtml
    ? getBeatAnimatedVideoPath(context, index)
    : imagePath;

  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, true);
    const processorParams = {
      beat, context,
      imagePath: effectiveImagePath,
      imageRefs,
      ...htmlStyle(context, beat),
    };
    await plugin.process(processorParams);
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, false);
  } catch (error) {
    MulmoStudioContextMethods.setBeatSessionState(context, "image", index, beat.id, false);
    throw error;
  }
};
```

#### `src/actions/movie.ts` — 変更不要

animated html_tailwind の出力が `studioBeat.movieFile` に格納されるため、
既存の `isMovie` 判定で自動的に `isMovie=true` になる:

```typescript
const isMovie = !!(
  studioBeat.lipSyncFile ||
  studioBeat.movieFile ||      // ← animated html_tailwind の .mp4 がここに入る
  MulmoPresentationStyleMethods.getImageType(context.presentationStyle, beat) === "movie"
);
```

追加の条件分岐は不要。

#### `src/actions/images.ts` GraphAI グラフ — 最小限の変更

`output` ノードは `":preprocessor.movieFile"` を参照しているため、
preprocessor が正しい `.mp4` パスを返せばグラフの変更は不要。

ただし、`imagePlugin` ノードで `imageFromMovie` が true の場合に
`imageFromMovie` ノードが `movieFile` からサムネイルを抽出する処理が走る。
animated html_tailwind では `imagePlugin` が動画を生成するので、
**`imageFromMovie` ノードは `imagePlugin` の完了を待つ必要がある**:

```typescript
imageFromMovie: {
  if: ":preprocessor.imageFromMovie",
  agent: async (namedInputs: { movieFile: string; imageFile: string }) => {
    return await extractImageFromMovie(namedInputs.movieFile, namedInputs.imageFile);
  },
  inputs: {
    onComplete: [":movieGenerator", ":imagePlugin"],  // ← :imagePlugin を追加
    imageFile: ":preprocessor.imagePath",
    movieFile: ":preprocessor.movieFile",
  },
  defaultValue: {},
},
```

同様に、**`audioChecker` にも `:imagePlugin` 依存を追加**する必要がある。
`audioChecker` は `preprocessor.movieFile` を `ffmpegGetMediaDuration` で読むため、
animated html_tailwind では `imagePlugin` が `.mp4` を生成し終わっている必要がある:

```typescript
audioChecker: {
  agent: async (namedInputs: { ... }) => { ... },
  inputs: {
    // ← :imagePlugin を追加（animated html_tailwind の .mp4 生成完了を待つ）
    onComplete: [":movieGenerator", ":htmlImageGenerator", ":soundEffectGenerator", ":imagePlugin"],
    movieFile: ":preprocessor.movieFile",
    imageFile: ":preprocessor.imagePath",
    soundEffectFile: ":preprocessor.soundEffectFile",
    index: ":__mapIndex",
  },
},
```

> **Note**: `:imagePlugin` を追加しても、非アニメーション時は `imagePlugin` が
> 先に完了するため性能劣化は発生しない。`imagePlugin` は `preprocessor` のみに依存しており、
> `movieGenerator` / `htmlImageGenerator` より高速に完了する。

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ imagePreprocessAgent                                         │
│                                                              │
│  beat.image.animation?                                       │
│    ├── undefined → imagePath: "0p.png" (static, 現行通り)     │
│    └── defined   → imagePath: "0p.png" (for thumbnail)       │
│                    movieFile: "0p_animated.mp4" (NEW)         │
│                    imageFromMovie: true                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ imagePluginAgent                                             │
│                                                              │
│  animated?                                                   │
│    ├── no  → plugin.process(imagePath="0p.png")              │
│    │         → Puppeteer → single screenshot → 0p.png        │
│    └── yes → plugin.process(imagePath="0p_animated.mp4")     │
│              → Puppeteer × N frames → FFmpeg → 0p_animated.mp4│
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ imageFromMovie (if imageFromMovie=true)                       │
│                                                              │
│  extractImageFromMovie("0p_animated.mp4", "0p.png")          │
│  → サムネイル抽出 → 0p.png                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ output → studioBeat                                          │
│                                                              │
│  imageFile: "0p.png"           (static image / thumbnail)    │
│  movieFile: "0p_animated.mp4"  (video for movie pipeline)    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ movie.ts (createVideo)                                       │
│                                                              │
│  isMovie = true (studioBeat.movieFile exists)                │
│  → tpad + trim + fps + scale → FFmpeg concat → final video   │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Frame Rendering Speed

| Duration | FPS | Total Frames | Estimated Time (50-200ms/frame) |
|----------|-----|--------------|---------------------------------|
| 3 sec    | 30  | 90           | 4.5 - 18 sec                    |
| 5 sec    | 30  | 150          | 7.5 - 30 sec                    |
| 10 sec   | 30  | 300          | 15 - 60 sec                     |
| 5 sec    | 15  | 75           | 3.75 - 15 sec                   |

### Optimization Options (Future)

1. **低 FPS オプション**: `animation: { fps: 15 }` で半分のフレーム数
2. **Browser reuse**: 複数ビートで同じ Puppeteer インスタンスを共有
3. **Parallel frame capture**: 複数ページで並列キャプチャ
4. **Skip unchanged frames**: `render()` の返り値で変更有無を判定

## Testing Plan

### Unit Tests

1. **`interpolate()` helper**: 境界値、クランプ動作
2. **Schema validation**: `animation: true`, `animation: { fps: 15 }`, `animation: undefined`
3. **totalFrames calculation**: `Math.floor(duration * fps)` — 境界値テスト
   - `duration=3, fps=30` → `90`
   - `duration=1.5, fps=30` → `45`
   - `duration=0.1, fps=30` → `3`
   - `duration=0.01, fps=30` → `0` → エラー
4. **File path generation**: `getBeatAnimatedVideoPath()` が `.mp4` を返すこと
5. **getAnimationConfig**: `true` → `{fps:30}`, `{fps:15}` → `{fps:15}`, `undefined` → `null`

### Integration Tests

1. **Static html_tailwind (regression)**: animation なしで既存動作が変わらないこと
2. **imagePreprocessAgent**: animated beat で `movieFile` に `.mp4` パス、`imageFromMovie: true` が返ること
3. **Movie pipeline**: animated beat の `studioBeat.movieFile` が設定され、`isMovie=true` になること

### Manual Test

簡単な fade-in アニメーションの MulmoScript を作成して end-to-end テスト:

```json
{
  "beats": [{
    "text": "",
    "duration": 2,
    "image": {
      "type": "html_tailwind",
      "html": [
        "<div id='box' class='w-32 h-32 bg-blue-500 mx-auto mt-40 rounded-xl'></div>",
        "<script>",
        "function render(f, total, fps) {",
        "  const el = document.getElementById('box');",
        "  el.style.opacity = interpolate(f, [0, 30], [0, 1]);",
        "  el.style.transform = 'scale(' + interpolate(f, [0, 30], [0.5, 1]) + ')';",
        "}",
        "</script>"
      ],
      "animation": true
    }
  }]
}
```

## Implementation Steps

1. **Schema**: `mulmoHtmlTailwindMediaSchema` に `animation` 追加
2. **File path**: `getBeatAnimatedVideoPath()` を `file.ts` に追加
3. **Template**: `assets/html/tailwind_animated.html` 作成
4. **Renderer**: `renderHTMLToFrames()` 実装 + unit test
5. **Video converter**: `framesToVideo()` を `ffmpeg_utils.ts` に追加
6. **Plugin**: `html_tailwind.ts` を static/animated に分岐
7. **Pipeline**: `image_agents.ts` の preprocessor（moviePrompt 排他チェック含む）と pluginAgent を修正
8. **Pipeline**: `images.ts` の `imageFromMovie` と `audioChecker` ノードに `:imagePlugin` 依存追加
9. **E2E test**: 手動テスト用 MulmoScript 作成・実行
10. **Documentation**: README にアニメーション機能の説明追加
