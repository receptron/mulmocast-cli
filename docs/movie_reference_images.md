# Movie Generation — Reference Images & Frame Control

MulmoCast supports passing reference images, first frame, and last frame to movie generation agents for enhanced control over video output.

## Usage

### First Frame (Image-to-Video)

Two ways to specify a first frame:

**Option A**: Generate via `imagePrompt` — the generated image becomes the first frame:

```json
{
  "imagePrompt": "A serene Japanese garden in spring",
  "moviePrompt": "Cherry blossom petals gently falling"
}
```

**Option B**: Reference an existing image via `firstFrameImageName` — no image generation needed:

```json
{
  "moviePrompt": "Cherry blossom petals gently falling",
  "movieParams": {
    "firstFrameImageName": "start_frame"
  }
}
```

`firstFrameImageName` references a key in `imageParams.images`. If both `imagePrompt` and `firstFrameImageName` are set, `firstFrameImageName` takes precedence.

### Last Frame (Interpolation)

Specify `lastFrameImageName` in `movieParams` to set an end frame. The video will interpolate between the first and last frames:

```json
{
  "moviePrompt": "Time-lapse transitioning from day to sunset",
  "movieParams": {
    "firstFrameImageName": "start_frame",
    "lastFrameImageName": "end_frame"
  }
}
```

> **Note**: `lastFrameImageName` requires a first frame image (`imagePrompt` or `firstFrameImageName`).

### `$beatImage` — the beat's own image as a frame

The reserved name `"$beatImage"` refers to the beat's own generated image (from `imagePrompt` or a beat `image`). This makes "animate toward the beat's still" expressible — e.g. a blank-paper → finished-illustration time-lapse:

```json
{
  "imagePrompt": "Travis, the robot and the ship in one shot",
  "imageNames": ["portrait_travis", "portrait_robot", "portrait_ship"],
  "moviePrompt": "An artist's hand draws the linework, then paints watercolor washes",
  "movieParams": {
    "firstFrameImageName": "blank_paper",
    "lastFrameImageName": "$beatImage"
  }
}
```

The beat image is generated first, conformed to the canvas aspect ratio, and passed as the last frame. Constraints:

- `$beatImage` cannot be used for both `firstFrameImageName` and `lastFrameImageName` at once.
- `lastFrameImageName: "$beatImage"` requires an explicit `firstFrameImageName`: the implicit first frame (the raw beat image) is not conformed to the canvas, and strict image-to-video models (e.g. wan-2.2-i2v-fast) reject mismatched frame sizes.
- The beat must produce its own still: an `imagePrompt` or an `image` (but not `image.type` `"movie"`, `"beat"`, or `"voice_over"`, whose image derives from the movie or another beat).
- Keys in `imageParams.images` / beat-local `images` and names in `beat.imageNames` may not start with `$` — that prefix is reserved.

(Note: `firstFrameImageName: "$beatImage"` is also accepted, but the beat image is already the default image-to-video start frame; the sentinel just makes it explicit and applies canvas conforming.)

### Reference Images (Style/Asset)

Use `referenceImages` in `movieParams` to provide style or asset references without setting a first frame:

```json
{
  "moviePrompt": "A red sports car driving through a city",
  "movieParams": {
    "referenceImages": [
      { "imageName": "car_ref", "referenceType": "ASSET" },
      { "imageName": "anime_style", "referenceType": "STYLE" }
    ]
  }
}
```

- **ASSET**: Scene, object, or character reference (up to 3)
- **STYLE**: Aesthetic reference — colors, lighting, texture (up to 1)

All `imageName` and `lastFrameImageName` values reference keys in `imageParams.images`.

## API Constraints (Veo 3.1)

`referenceImages` and `image`/`lastFrame` are **mutually exclusive**:

| Combination                                 | Allowed |
| ------------------------------------------- | ------- |
| moviePrompt only                            | ✅      |
| moviePrompt + first frame                   | ✅      |
| moviePrompt + first frame + lastFrame       | ✅      |
| moviePrompt + referenceImages               | ✅      |
| moviePrompt + first frame + referenceImages | ❌      |
| moviePrompt + lastFrame + referenceImages   | ❌      |

When both are specified, `referenceImages` is silently ignored and `first frame + lastFrame` takes precedence.

## Duration and Video Extension (Veo 3.1)

For videos **8 seconds or shorter**, all features are available:

- `firstFrameImageName` + `lastFrameImageName` (interpolation)
- `referenceImages` (style/asset)

For videos **longer than 8 seconds**, Veo 3.1 uses video extension (generating an initial 8s clip, then extending iteratively). This has additional constraints:

| Duration                    |        firstFrame         | lastFrame | referenceImages |
| --------------------------- | :-----------------------: | :-------: | :-------------: |
| ≤ 8s (standard)             |            ✅             |    ✅     |       ✅        |
| > 8s (extension) initial    |            ✅             |   ❌ \*   |     ❌ \*\*     |
| > 8s (extension) subsequent | N/A (uses previous video) |    ❌     |       ❌        |

\* `lastFrame` requires `image` input, but using it means the video reaches the end state in the first 8s, then extends from there — likely not the intended behavior.

\*\* `referenceImages` is mutually exclusive with `image` (first frame), and the initial iteration typically uses a first frame for best results.

**Recommendation**: Use `lastFrame` and `referenceImages` only with videos ≤ 8 seconds. For longer videos, use `firstFrameImageName` only to set the starting point, and let the model extend naturally.

## Model Support Matrix

### Google Gemini (GenAI)

| Feature              |   veo-2.0   | veo-3.0 |   veo-3.1    |
| -------------------- | :---------: | :-----: | :----------: |
| **first frame**      |     ✅      |   ✅    |      ✅      |
| **lastFrame**        | ✅ (Vertex) |   ❌    |      ✅      |
| **referenceImages**  |     ❌      |   ❌    | ✅ (preview) |
| **video extension**  | ✅ (Vertex) |   ❌    |      ✅      |
| **generateAudio**    |     ❌      |   ✅    |      ✅      |
| **personGeneration** |     ✅      |   ❌    |      ❌      |
| **Duration**         |  5,6,7,8s   | 4,6,8s  |    4,6,8s    |

### Replicate

| Model                                      | first frame | lastFrame | lastFrame param    | generateAudio | audio param           |
| ------------------------------------------ | :---------: | :-------: | ------------------ | :-----------: | --------------------- |
| **seedance-1-lite/pro**                    |     ✅      |    ✅     | `last_frame_image` |      ❌       | —                     |
| **seedance-2.0/2.0-fast**                  |     ✅      |    ✅     | `last_frame_image` |   optional    | `generate_audio`      |
| **pixverse-v4.5**                          |     ✅      |    ✅     | `last_frame_image` |   optional    | `sound_effect_switch` |
| **pixverse-v5**                            |     ✅      |    ✅     | `last_frame_image` |      ❌       | —                     |
| **hailuo-02**                              |     ✅      |    ✅     | `end_image`        |      ❌       | —                     |
| **hailuo-02-fast / hailuo-2.3 / 2.3-fast** |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **kling-v1.6/2.1/2.1-master**              |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **kling-v3-video/v3-omni-video**           |     ✅      |    ✅     | `end_image`        |   optional    | `generate_audio`      |
| **veo-2 (Replicate)**                      |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **veo-3/3-fast**                           |     ✅      |    ❌     | —                  |   optional    | `generate_audio`      |
| **veo-3.1/3.1-fast**                       |     ✅      |    ✅     | `last_frame_image` |   optional    | `generate_audio`      |
| **veo-3.1-lite**                           |     ✅      |    ✅     | `last_frame`       |      ❌       | —                     |
| **minimax/video-01**                       |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **runwayml/gen-4.5**                       |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **alibaba/happyhorse-1.0**                 |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **prunaai/p-video**                        |     ✅      |    ✅     | `last_frame_image` |   optional    | `save_audio`          |
| **xai/grok-imagine-video**                 |     ✅      |    ❌     | —                  |      ❌       | —                     |
| **xai/grok-imagine-video-1.5**             |     ✅      |    ❌     | —                  |    always     | —                     |
| **xai/grok-imagine-r2v**                   |     ❌      |    ❌     | —                  |      ❌       | —                     |
| **wan-2.2-i2v-fast**                       |     ✅      |    ✅     | `last_image`       |      ❌       | —                     |
| **wan-2.2-t2v-fast**                       |     ❌      |    ❌     | —                  |      ❌       | —                     |

> **Note**: `referenceImages` is supported by Veo 3.1 (Google GenAI), Kling v3, and Grok R2V (Replicate).

> **First frame required**: `wan-2.2-i2v-fast`, `hailuo-2.3-fast`, and `grok-imagine-video-1.5` cannot generate from text alone — they need an `imagePrompt` / `firstFrameImageName` (or a beat image).

> **Audio behavior**: models marked `optional` are **silent by default** — set `movieParams: { "generateAudio": true }` to embed the generated soundtrack. Models marked `always` (grok-imagine-video-1.5) embed audio in every output and cannot be silenced; `generateAudio: false` logs a warning and is ignored.

## Test Script

See `scripts/test/test_movie_references.json` for 9 patterns covering all combinations:

| Pattern | First Frame         | Last Frame | Ref Images | Description                 |
| ------- | ------------------- | ---------- | ---------- | --------------------------- |
| 1       | —                   | —          | —          | Text-to-video               |
| 2       | imagePrompt         | —          | —          | Image-to-video              |
| 3       | imagePrompt         | ✅         | —          | Interpolation               |
| 4       | —                   | —          | ASSET      | Subject reference           |
| 5       | —                   | —          | STYLE      | Style reference             |
| 6       | —                   | —          | 2× ASSET   | Multiple assets             |
| 7       | imagePrompt         | ✅         | ASSET      | All specified (ref ignored) |
| 8       | firstFrameImageName | —          | —          | Ref image as first frame    |
| 9       | firstFrameImageName | ✅         | —          | Ref first + last frame      |
