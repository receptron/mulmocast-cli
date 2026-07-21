# Plan: Multiple reference images for `imagePrompt` media + `$beatImage` frame sentinel

Two backward-compatible extensions to image generation:

1. **`references` array on `imagePrompt` media** — a named image (in `imageParams.images` or
   beat-local `images`) can be generated from multiple reference images, each with an optional
   role `label` injected into the prompt.
2. **`"$beatImage"` sentinel for `movieParams.firstFrameImageName` / `lastFrameImageName`** —
   a beat's own generated image can be used as a movie interpolation frame.

Caching is explicitly **out of scope**: the file-existence cache (`fileCacheAgentFilter`)
stays as is.

## 1. `references` on `imagePrompt` media

### Schema (`src/types/schema.ts`)

```ts
export const mulmoImageReferenceSchema = z
  .object({
    name: imageIdSchema.optional(),        // an imageRefs key
    source: mediaSourceSchema.optional(),  // OR a direct path/url source
    label: z.string().optional(),          // role of this reference, injected into the prompt
  })
  .strict()
  .refine((r) => (r.name === undefined) !== (r.source === undefined), ...);
```

- `mulmoImagePromptMediaSchema` gains `references: z.array(mulmoImageReferenceSchema).optional()`.
- `referenceImageName` / `referenceImage` remain valid; internally normalized as the leading
  entries of the reference list (deprecate in docs only).
- `imageParams.images` / beat-local `images` record keys reject the reserved `$` prefix.

### Normalization (`src/methods/mulmo_image_prompt_media.ts`, new)

`MulmoImagePromptMediaMethods` (browser-safe, no Node built-ins):

- `getReferences(image)` — normalized list; legacy `referenceImageName`/`referenceImage` first,
  then `references[]`.
- `hasNamedReference(image)` — true iff any reference uses `name` (drives stage assignment).
- `buildReferencePreamble(labels)` — `"Reference image 1 shows <label>. … Use these exact designs.\n"`;
  returns `""` when no reference has a label, keeping legacy prompts byte-identical.

### Resolution (`src/actions/image_references.ts`)

- Stage 1 handles `imagePrompt` entries with no named reference (source-only or none);
  stage 2 handles entries with at least one `name` (same two-stage structure as today, in both
  `getMediaRefs` and `resolveLocalRefs`).
- Each `name` resolves against the same ref map as today; a missing name warns and skips that
  reference (existing behavior).
- Each `source` resolves via `MulmoMediaSourceMethods.imageReference`. The legacy
  `referenceImage` keeps the bare `key` for its download filename; `references[i].source`
  uses `${key}_ref${i}` so multiple URL sources don't collide.
- `generateReferenceImage` accepts `references?: { path: string; label?: string }[]`
  (the existing public `referenceImagePath?: string` remains as sugar for `[{ path }]`),
  builds the label preamble before `image.prompt` + global style suffix, and passes
  `referenceImages: paths` to the agent (already an array end-to-end).

### Provider limits (`src/types/provider2agent.ts`)

- `getMaxImageReferenceImages(provider, model)`: openai → 16 (`images.edit` hard limit);
  replicate → per-model table (only verified entries, e.g. `bytedance/seedream-4` → 10);
  otherwise `undefined` (no truncation).
- `generateReferenceImage` warns and deterministically keeps the first N when exceeded.

## 2. `$beatImage` frame sentinel

### Semantics

`firstFrameImageName: "$beatImage"` / `lastFrameImageName: "$beatImage"` resolve to the beat's
own image (generated `imagePrompt` still, or the beat's `image` plugin output).

Validation (runtime, in `imagePreprocessAgent`):

- reject `$beatImage` on both first and last frame simultaneously;
- reject when the beat has no image-producing field (no `imagePrompt`, no `image`);
- reject when the beat's image is itself derived from the movie
  (`moviePrompt`-only beats, `image.type === "movie"`) or resolved after the map
  (`image.type === "beat"` / `voice_over`).

### Ordering problem and the `frameResolver` node

`imagePreprocessAgent` runs **before** `imageGenerator`, so the beat image does not exist yet
and `conformFrameImageToCanvas` would silently no-op on fresh runs. Fix: resolve the sentinel
in a new `frameResolver` node in `beat_graph_data` that runs after `imageGenerator` /
`imagePlugin`:

- `imagePreprocessAgent` sets `firstFrameIsBeatImage` / `lastFrameIsBeatImage` flags (plus
  `frameFillColor`) instead of paths when the sentinel is used;
- `beatFrameResolverAgent` (new, `src/actions/image_agents.ts`) conforms the now-existing beat
  image to the canvas and produces final `firstFrameImagePath` / `lastFrameImagePath` /
  `referenceImageForMovie`, passing through the preprocessor's values for non-sentinel beats;
- `movieGenerator` reads `imagePath` and `lastFrameImagePath` from `:frameResolver`.

No default-behavior change for scripts that don't use the sentinel.

## Affected files

- `src/types/schema.ts`, `src/types/type.ts`, `src/types/provider2agent.ts`
- `src/methods/mulmo_image_prompt_media.ts` (new), `src/methods/index.ts`
- `src/actions/image_references.ts`, `src/actions/image_agents.ts`, `src/actions/images.ts`
- `src/actions/images.docs.md` (regenerated via `yarn generate_action_docs`)
- tests: `test/methods/`, `test/actions/`, `test/zod/`

## Usage example

```jsonc
{
  "imageParams": {
    "images": {
      "blank_paper": { "type": "image", "source": { "kind": "path", "path": "./assets/blank.png" } },
      "scene_09": {
        "type": "imagePrompt",
        "prompt": "Travis stands in the charred clearing at dusk, radio raised...",
        "references": [
          { "name": "portrait_travis_kane", "label": "the firefighter Travis Kane" },
          { "name": "portrait_hexapod_probe", "label": "the six-legged probe robot" },
          { "source": { "kind": "path", "path": "./refs/ship.png" }, "label": "the capsule-shaped black spacecraft" },
        ],
      },
    },
  },
  "beats": [
    {
      "imagePrompt": "Travis, the robot and the ship in one shot ...",
      "imageNames": ["portrait_travis_kane", "portrait_hexapod_probe"],
      "moviePrompt": "An artist's hand draws the linework, then paints watercolor washes...",
      "movieParams": { "firstFrameImageName": "blank_paper", "lastFrameImageName": "$beatImage" },
    },
  ],
}
```

## Out of scope (follow-ups)

- Content-based cache identity (prompt/reference changes invalidating cached generations).
- Chained references among stage-2 entries (topological resolution).
- Cross-beat references to beat-local images.
