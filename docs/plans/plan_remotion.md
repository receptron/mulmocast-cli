# Plan: `remotion` image type (#1592)

A beat describes its scene in words. Claude Code (`claude -p`) writes a Remotion component for it, and
MulmoCast renders that component to the beat's video. User-facing details: `docs/remotion.md`.

## Schema

```json
{
  "remotionParams": { "brief": "whole-video art direction" },
  "beats": [{ "text": "narration", "image": { "type": "remotion", "prompt": "what the scene shows", "fps": 30 } }]
}
```

- `image.prompt` (required): what to show. `image.fps` (optional, default the same as animated `html_tailwind`).
- `remotionParams.brief` (presentation style, optional): shared by every remotion beat so the scenes look like one film.

## Flow

1. **Pre-flight**: every package in `src/utils/remotion/packages.ts` must be installed; a missing one stops the beat
   before `claude -p` is called, with the install command built from that list.
2. **Generate** (`src/utils/remotion/claude_runner.ts`, prompts in `claude_prompt.ts` and `system_prompt.ts`)
   - `claude -p <scene prompt> --system-prompt <fixed> --tools "" --setting-sources "" --strict-mcp-config --restricted --output-format json --no-session-persistence`,
     run in the beat's work directory with stdin closed.
   - The scene prompt carries the beat prompt, the spoken narration (`localizedText`, as audio and captions use), the
     brief, the scene's position in the script, canvas size and fps.
   - The system prompt fixes the contract (one `export default` component; imports only from `react`, `remotion` and the
     scene packages in `packages.ts`; everything driven by `useCurrentFrame()`, scheduled as fractions of
     `durationInFrames`), a design system, a motion language and a toolkit of snippets rendered with this renderer
     (paths, noise, three.js, `@remotion/effects` via `HtmlInCanvas`, light leak, shapes).
   - The TSX is cached as `<beat>_remotion/<hash>.tsx`; the hash covers every input of the scene prompt plus the system
     prompt. `-f` regenerates.
3. **Render** (`src/utils/remotion/render.ts`)
   - Writes an entry that registers the component as one composition whose length, fps and size come from input props.
   - `@remotion/bundler` → `selectComposition` → `renderMedia` (h264) to the beat's `_animated.mp4`, and `renderStill`
     frames (the last one becomes the beat's PNG). Chromium runs with `gl: "angle"` for WebGL.
   - Webpack resolves `react` / `remotion` from where those packages are installed, not from the output directory.
4. **Repair**: a bundle/render error and the failing code go back to `claude -p`, a bounded number of times. The repaired
   code replaces the cached file.
5. **Visual self-review** (newly generated scenes only): review frames are rendered with the same bundle; `claude -p` with
   only the `Read` tool (confined to the work dir by `--restricted`) answers `LGTM` or returns an improved component. A
   reviewed version that does not render, or a review that fails, keeps the first version.

## Pipeline wiring

- `MulmoBeatMethods.isPluginVideo(beat)`: animated `html_tailwind` **or** `remotion`. It replaces `isAnimatedHtmlTailwind`
  where the question is "does the plugin write an mp4" (`image_agents.ts` preprocess and `imagePluginAgent`,
  `combine_audio_files_agent.ts`).
- The preprocess records the `.mp4` as `movieFile` only when the beat's duration is known. Without one (e.g. images/PDF
  without audio) the plugin writes only the PNG.
- `soundEffectPrompt` does not work for plugin-written videos yet: `soundEffectGenerator` waits only on `movieGenerator`.

## Pure parts (tested in `test/`)

- Building the `claude` arguments, extracting the code block, parsing replies, the scene/repair/review prompts, the cache
  key, the entry source, the package list and its drift against docs and `package.json`.
- The plugin takes the pre-flight, generator, reviewer and renderer as injectable functions, so tests run without Claude
  Code or Remotion.

## Not in this change

Per-beat model choice, a component file instead of a prompt, one bundle for all beats, sound effects for plugin videos.
