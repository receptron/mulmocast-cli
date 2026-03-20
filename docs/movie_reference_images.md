# Movie Generation — Reference Images & Frame Control

MulmoCast supports passing reference images, first frame, and last frame to movie generation agents for enhanced control over video output.

## Usage

### First Frame (Image-to-Video)

Use `imagePrompt` to generate a first frame image, which is automatically passed to the movie agent:

```json
{
  "imagePrompt": "A serene Japanese garden in spring",
  "moviePrompt": "Cherry blossom petals gently falling"
}
```

The generated image becomes the first frame of the video.

### Last Frame (Interpolation)

Specify `lastFrameImageName` in `movieParams` to set an end frame. The video will interpolate between the first and last frames:

```json
{
  "imagePrompt": "A garden in bright daylight",
  "moviePrompt": "Time-lapse transitioning from day to sunset",
  "movieParams": {
    "lastFrameImageName": "end_frame"
  }
}
```

> **Note**: `lastFrameImageName` requires a first frame image (`imagePrompt`).

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

| Combination | Allowed |
|---|---|
| moviePrompt only | ✅ |
| moviePrompt + first frame | ✅ |
| moviePrompt + first frame + lastFrame | ✅ |
| moviePrompt + referenceImages | ✅ |
| moviePrompt + first frame + referenceImages | ❌ |
| moviePrompt + lastFrame + referenceImages | ❌ |

When both are specified, `referenceImages` is silently ignored and `first frame + lastFrame` takes precedence.

## Model Support Matrix

### Google Gemini (GenAI)

| Feature | veo-2.0 | veo-3.0 | veo-3.1 |
|---|:---:|:---:|:---:|
| **first frame** | ✅ | ✅ | ✅ |
| **lastFrame** | ✅ (Vertex) | ❌ | ✅ |
| **referenceImages** | ❌ | ❌ | ✅ (preview) |
| **video extension** | ✅ (Vertex) | ❌ | ✅ |
| **generateAudio** | ❌ | ✅ | ✅ |
| **personGeneration** | ✅ | ❌ | ❌ |
| **Duration** | 5,6,7,8s | 4,6,8s | 4,6,8s |

### Replicate

| Model | first frame | lastFrame | Param Name |
|---|:---:|:---:|---|
| **seedance-1-lite/pro** | ✅ | ✅ | `last_frame_image` |
| **pixverse-v4.5** | ✅ | ✅ | `last_frame_image` |
| **hailuo-02** | ✅ | ✅ | `end_image` |
| **kling-v1.6/2.1/2.1-master** | ✅ | ❌ | — |
| **veo-2/3 (Replicate)** | ✅ | ❌ | — |
| **minimax/video-01** | ✅ | ❌ | — |
| **wan-video/wan-2.2** | ✅ | ❌ | — |

> **Note**: `referenceImages` is only supported by Veo 3.1 (Google GenAI). Replicate models do not support it.

## Test Script

See `scripts/test/test_movie_references.json` for 7 patterns covering all combinations.
