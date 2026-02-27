# Plan: html_tailwind animation auto-duration from audio

**Issue**: #1248
**Date**: 2026-02-28

## Background

### Current Flow

```text
Audio Stage
  → TTS generates audio files
  → combine_audio_files_agent calculates duration from audio + padding
  → Sets studioBeat.duration, studioBeat.audioDuration

Image Stage
  → imagePreprocessAgent: beatDuration = beat.duration ?? studioBeat?.duration
  → imagePluginAgent: calls plugin.process({ beat, context, imagePath, ... })
  → html_tailwind.ts: reads beat.duration → ERROR if undefined

Movie Stage
  → duration = max(studioBeat.duration, studioBeat.movieDuration)
  → Stitches beats using the longer of audio/video
```

### Problem

- `html_tailwind.ts` reads `beat.duration` (from script JSON), not the computed `studioBeat.duration`
- When `beat.duration` is omitted, animation throws error instead of using audio-derived duration
- `ImageProcessorParams` type has no `beatDuration` field

## Changes

### 1. Add `beatDuration` to `ImageProcessorParams`

**File**: `src/types/type.ts`

```typescript
export type ImageProcessorParams = {
  beat: MulmoBeat;
  context: MulmoStudioContext;
  imagePath: string;
  textSlideStyle: string;
  canvasSize: MulmoCanvasDimension;
  imageRefs?: Record<string, string>;
  beatDuration?: number;  // ← NEW: computed duration from audio stage fallback
};
```

### 2. Pass `beatDuration` in `imagePluginAgent`

**File**: `src/actions/image_agents.ts`

In `imagePluginAgent`, compute the effective duration and pass it:

```typescript
const studioBeat = context.studio.beats[index];
const beatDuration = beat.duration ?? studioBeat?.duration;
const processorParams = {
  beat, context, imagePath: effectiveImagePath, imageRefs,
  beatDuration,  // ← NEW
  ...htmlStyle(context, beat)
};
```

### 3. Use `beatDuration` in html_tailwind plugin

**File**: `src/utils/image_plugins/html_tailwind.ts`

Change `processHtmlTailwindAnimated`:

```typescript
// Before:
const duration = beat.duration;
if (duration === undefined) {
  throw new Error("html_tailwind animation requires explicit beat.duration.");
}

// After:
const duration = params.beatDuration ?? beat.duration;
if (duration === undefined) {
  throw new Error("html_tailwind animation requires beat.duration or audio-derived duration.");
}
```

### 4. Pass `beatDuration` in `imagePreprocessAgent` return value (for other consumers)

**File**: `src/actions/image_agents.ts`

Already computes `beatDuration: beat.duration ?? studioBeat?.duration` on line 94.
Ensure this is consistently used.

## Files Changed

| File | Change |
|------|--------|
| `src/types/type.ts` | Add `beatDuration?` to `ImageProcessorParams` |
| `src/actions/image_agents.ts` | Pass `beatDuration` in `imagePluginAgent` processorParams |
| `src/utils/image_plugins/html_tailwind.ts` | Use `params.beatDuration` with fallback |

## Verification

1. **Existing behavior preserved**: Beats with explicit `duration` work exactly as before
2. **New behavior**: Animated beats without `duration` use audio-derived duration
3. **Test**: Remove `duration` from an animated beat in `test_html_animation.json`, verify it renders using audio duration
4. `yarn format && yarn lint && yarn build`

## Out of Scope

- Changing movie assembly logic (already uses `max(duration, movieDuration)`)
- Changing audio duration calculation
- Changing non-animated html_tailwind beats (static rendering doesn't need duration)
