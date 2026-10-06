# Plan: `remotion` image type (#1592)

A beat describes its scene in words. Claude Code (`claude -p`) writes a Remotion component for it, and
MulmoCast renders that component to the beat's video.

## Schema

```json
"image": { "type": "remotion", "prompt": "what the scene shows", "fps": 30 }
```

- `prompt` (required): what to show. Sent to `claude -p` as the user message.
- `fps` (optional, default the same as animated `html_tailwind`).

## Flow

1. **Generate** (`src/utils/remotion/generate.ts`)
   - `claude -p <prompt> --system-prompt <fixed> --tools "" --setting-sources "" --strict-mcp-config --output-format json --no-session-persistence`, run in the beat's work directory with stdin closed.
   - The system prompt fixes the contract: one `export default` component, imports only from `react` and `remotion`, timing from `useVideoConfig()` as fractions of `durationInFrames`, inline styles.
   - The TSX is taken from the reply's code block and cached as `<hash>.tsx`. The hash covers the prompt, fps, canvas size and the system prompt, so editing any of them regenerates; `-f` regenerates too.
2. **Render** (`src/utils/remotion/render.ts`)
   - Writes an entry that registers the component as one composition whose length, fps and size come from input props.
   - `@remotion/bundler` → `selectComposition` → `renderMedia` (h264) to the beat's `_animated.mp4`, and `renderStill` of the last frame to the beat's PNG.
   - Webpack resolves `react` / `remotion` from where those packages are installed, not from the output directory.
3. **Repair**: if bundling or rendering fails, the error and the failing code go back to `claude -p`, a bounded number of times. The repaired code replaces the cached file.

## Pipeline wiring

- `MulmoBeatMethods.isPluginVideo(beat)`: animated `html_tailwind` **or** `remotion`. It replaces `isAnimatedHtmlTailwind` where the question is "does the plugin write an mp4" (`image_agents.ts` preprocess and `imagePluginAgent`, `combine_audio_files_agent.ts`).
- Without a known duration (e.g. PDF without audio) only the PNG is rendered, as for `html_tailwind`.

## Pure parts (tested in `test/`)

- Building the `claude` arguments, extracting the code block, the cache key, the entry source, the repair prompt.
- The plugin takes the generator and renderer as injectable functions so tests run without Claude Code or Remotion.

## Dependencies

Every package in `src/utils/remotion/packages.ts` is an optional peer dependency and a devDependency, loaded
by dynamic import only when a `remotion` beat renders. A missing one stops the beat before `claude -p` is called,
with the install command built from that list.

## Not in this change

Per-beat model choice, a component file instead of a prompt, one bundle for all beats.

## Added after the first version (quality toward commercial level)

Reference: a showcase of Remotion videos written by Claude, and Remotion's official agent skills for LLMs.

- **System prompt** moved to `src/utils/remotion/system_prompt.ts`: hard timing rules (frame-driven only, no CSS animation,
  `random()` instead of `Math.random()`, no `useFrame`), a design system in `width / 1920` units, a motion language, and a
  toolkit of snippets that were rendered with this renderer (paths, noise, three.js, `@remotion/effects` through
  `HtmlInCanvas`, light leak, shapes).
- **More packages** (all optional peers): `@remotion/three`, `three`, `@react-three/fiber`, `@remotion/effects`,
  `@remotion/paths`, `@remotion/noise`, `@remotion/shapes`, `@remotion/transitions`, `@remotion/motion-blur`,
  `@remotion/layout-utils`. Chromium runs with `gl: "angle"` so WebGL works headless.
- **Whole-video consistency**: `remotionParams.brief` (presentation style) and the scene's position in the script go to every
  scene prompt, so palette, type and numbering agree across scenes. Both are part of the cache key.
- **Visual self-review**: a newly generated scene also renders frames at fixed fractions; `claude -p` with only the `Read` tool
  looks at them and either approves (`LGTM`) or returns an improved component. A reviewed version that does not render, or a
  review that fails, keeps the first version. Cached scenes are not reviewed again.
