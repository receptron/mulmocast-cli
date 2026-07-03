# Changelog

All notable changes to this project will be documented in this file.

## [2.7.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.7.0) (2026-07-03)

- **Pre-run usage estimator** ([#1466](https://github.com/receptron/mulmocast-cli/pull/1466), closes [#1465](https://github.com/receptron/mulmocast-cli/issues/1465)): new `estimateUsage(script, options?)` walks a MulmoScript **before generating anything** and returns per-beat, per-process usage records (tokens / characters / billed seconds) with a `precision: "exact" | "estimated"` flag per metric, plus `costUSD` when pricing is known. Exact metrics were validated against real billed usage (±0%; heuristics within ±10% — see the [validation record](https://github.com/receptron/mulmocast-cli/pull/1466#issuecomment-4873194771) and `scripts/probe/probe_estimate_vs_actual.ts`). OpenAI prompts are tokenized with js-tiktoken (`o200k_base`); browser-compatible and exported from both entries.
- **Model pricing data** ([#1466](https://github.com/receptron/mulmocast-cli/pull/1466)): new `modelPricing` table + `ModelPricing` type in `src/types/provider2agent.ts` — every price records the date it was verified against the provider's official pricing page (`asOf`). Replicate movie/lipSync entries are generated from the existing `price_per_sec` data. Also exports `gptImageOutputTokens` (gpt-image size × quality output-token table) and re-exports `provider2agent` from the types index so `@mulmocast/types` consumers get the tables.
- **`--estimate` CLI flag** ([#1468](https://github.com/receptron/mulmocast-cli/pull/1468), closes [#1467](https://github.com/receptron/mulmocast-cli/issues/1467)): `mulmo audio|images|movie|pdf|translate <script> --estimate` prints what that command would consume — scoped to its pipeline via the new `processes` option / `actionEstimateProcesses` map — and exits without generating. `--json` emits raw `UsageEstimate[]`; the default table (rendered by the new `formatUsageEstimates`) marks heuristic values with `~` and ends with a total-cost line.
- **Dependency updates** ([#1464](https://github.com/receptron/mulmocast-cli/pull/1464)): routine package bumps, including syncing `yarn.lock` with the `tar` 7.5.19 resolution.
- `src/types/` changed, so `@mulmocast/types` is released as **2.7.0** alongside (new `UsageEstimate` / `EstimatedMetric` / `ModelPricing` types and pricing tables).

📦 **npm**: [`mulmocast@2.7.0`](https://www.npmjs.com/package/mulmocast/v/2.7.0) / [`@mulmocast/types@2.7.0`](https://www.npmjs.com/package/@mulmocast/types/v/2.7.0)

## [2.6.23](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.23) (2026-06-30)

- **ElevenLabs TTS error detail** ([#1459](https://github.com/receptron/mulmocast-cli/pull/1459)): the IIFE catch-all in `tts_elevenlabs_agent` now interpolates the underlying error message instead of a generic literal — a continuation of the [#1451](https://github.com/receptron/mulmocast-cli/issues/1451) diagnostic-error sweep that landed after 2.6.22 was tagged.
- **Dependency updates** ([#1460](https://github.com/receptron/mulmocast-cli/pull/1460), [#1461](https://github.com/receptron/mulmocast-cli/pull/1461), [#1462](https://github.com/receptron/mulmocast-cli/pull/1462)): routine package bumps. `eslint-plugin-sonarjs` 4.0.3 → 4.1.0 added `no-floating-point-equality` and a stricter `assertions-in-tests`; affected tests were updated to comply (no lint rules disabled).
- No public API change; no `src/types/` change (so `@mulmocast/types` is unchanged).

📦 **npm**: [`mulmocast@2.6.23`](https://www.npmjs.com/package/mulmocast/v/2.6.23)

## [2.6.22](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.22) (2026-06-25)

- **Diagnostic-error sweep ([#1451](https://github.com/receptron/mulmocast-cli/issues/1451))**: a `mulmoclaude` end-user hit an `ffmpeg was killed with signal SIGABRT` whose only surface log line read `error="TTS Gemini Error"` — the actual ffmpeg stderr never reached the thrown error message, so triage chased the wrong subsystem. This release plugs every variant of the same masking pattern across 6 agents / handlers:
  - **TTS Gemini** ([#1452](https://github.com/receptron/mulmocast-cli/pull/1452)): split the Gemini API call and `pcmToMp3` (ffmpeg) into separate try blocks. ffmpeg failures now surface as `"Audio encoding (ffmpeg) failed: <stderr>"`; non-API-KEY Gemini failures now include the underlying message.
  - **Whisper CLI handler** ([#1453](https://github.com/receptron/mulmocast-cli/pull/1453)): split into 3 phases (ffmpeg duration / OpenAI transcribe / fs write) so each phase's failure logs the right subsystem instead of the generic `"Error transcribing audio:"`.
  - **Replicate image / lipsync / movie** ([#1454](https://github.com/receptron/mulmocast-cli/pull/1454), [#1455](https://github.com/receptron/mulmocast-cli/pull/1455), [#1456](https://github.com/receptron/mulmocast-cli/pull/1456)): catch-all throws now interpolate `error.message`, so Replicate SDK errors without `cause`, `fetch()` ETIMEDOUT/ECONNRESET, and `arrayBuffer()` resets are diagnosable from the thrown error alone. `movie_replicate` additionally separates the catch-all from the legacy fall-through to `"ERROR: generateMovie returned undefined"` (that label is now reserved for the actual undefined-result case).
  - **OpenAI image** ([#1457](https://github.com/receptron/mulmocast-cli/pull/1457)): three throw sites all emitting the identical `"Failed to generate image with OpenAI"` literal now interpolate the underlying message; `AuthenticationError` / `RateLimitError` branches left as-is (their messages are already specific).
- Net effect: previously, `error="<opaque label>"` was the dominant terminal log line for any failure outside the structured-cause guard. After this release, ffmpeg crashes, network resets, and unanticipated SDK exceptions surface their real message at the throw site.
- No behaviour change on the happy path; no public API change; no test required adjustment (no test grepped for the old literal strings).

📦 **npm**: [`mulmocast@2.6.22`](https://www.npmjs.com/package/mulmocast/v/2.6.22)

## [2.6.21](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.21) (2026-06-21)

- **Token / API usage tracking**: full umbrella ([#1415](https://github.com/receptron/mulmocast-cli/issues/1415)) landed. Per-request `UsageCollector` on `MulmoStudioContext` surfaces structured usage from every AI agent — OpenAI / Gemini image (token), Replicate image/movie/sound_effect/lipsync (predict_sec via `replicate.run()` progress callback), Veo movie_genai (ffprobed mp4 duration), 5 TTS providers (token + char + ElevenLabs `character-cost` header), translate + tools LLM (`@graphai/*` shape adapter). Opt-in CLI dump via `MULMOCAST_DUMP_USAGE=1` (stdout) or `MULMOCAST_DUMP_USAGE=/path/to/file.json`. Full reference in [`docs/api.md`](./docs/api.md).
- **`docs/api.md`** ([#1442](https://github.com/receptron/mulmocast-cli/issues/1442) / [#1447](https://github.com/receptron/mulmocast-cli/pull/1447)): first consolidated programmatic API reference (lifecycle, action / per-beat / settings / callbacks / usage tracking matrix for all 17 AI agents).
- **Dependency updates**: `undici` 7.25.0 → 7.28.0 ([#1443](https://github.com/receptron/mulmocast-cli/pull/1443)).

📦 **npm**: [`mulmocast@2.6.21`](https://www.npmjs.com/package/mulmocast/v/2.6.21) · [`@mulmocast/types@2.6.21`](https://www.npmjs.com/package/@mulmocast/types/v/2.6.21)

## [2.6.20](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.20) (2026-06-09)

- **e2e CI parallelized**: split the monolithic `e2e` job into 16 shards × `[22.x, 24.x]` matrix so each script runs on its own runner; target wall-clock ~10 min vs ~30 min before (#1404)
- **`@mulmocast/types` version aligned**: 2.6.18 → 2.6.20 to match `mulmocast` (catches up types changes since `@mulmocast/types@2.4.0`)
- **Dependency updates**: `graphai` ^2.0.17 → ^2.0.18

📦 **npm**: [`mulmocast@2.6.20`](https://www.npmjs.com/package/mulmocast/v/2.6.20) · [`@mulmocast/types@2.6.20`](https://www.npmjs.com/package/@mulmocast/types/v/2.6.20)

## [2.6.19](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.19) (2026-06-06)

- **`getResolvedSlideTheme` method**: new `MulmoPresentationStyleMethods.getResolvedSlideTheme` exposes the merged slide theme (script + presentation style + defaults) so callers can read the effective theme without re-deriving it (#1402)
- **Dependency updates**: `@mulmocast/deck` ^0.7.0 → ^1.1.0 (adds `slide.intro` / `slide.staggerMs` CSS entrance animations), dependabot `hono` 4.12.18 → 4.12.23 (#1401, #1403)

📦 **npm**: [`mulmocast@2.6.19`](https://www.npmjs.com/package/mulmocast/v/2.6.19)

## [2.6.17](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.17) (2026-05-30)

- **`src/slide/` extracted to [`@mulmocast/deck`](https://www.npmjs.com/package/@mulmocast/deck)**: slide DSL module is now a standalone MIT-licensed npm package (receptron/mulmocast-deck). `mulmocast` and `@mulmocast/types` consume it via dependency
- **GitHub Actions hygiene**: bump `actions/cache` v4 → v5, `actions/upload-artifact` v6 → v7
- **Dependency updates**: routine updates incl. `@google/genai` 2.7, `puppeteer` 25.1, `mulmocast-vision` 1.0.10, dependabot `qs` 6.15.2

📦 **npm**: [`mulmocast@2.6.17`](https://www.npmjs.com/package/mulmocast/v/2.6.17)

## [2.6.16](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.16) (2026-05-21)

- **`mulmocast viewer` command**: generate a zero-dependency, single-file HTML slideshow openable via `file://` (slide images embedded as base64 data URIs). Keyboard nav, click-to-advance, fullscreen, slide counter. Prefers `htmlImageFile` over `imageFile` to match pdf/movie output (#1385, #1386)
- **Dependency updates**: graphai 2.0.17, puppeteer 25, `@modernized/fluent-ffmpeg` 1.0, `@google/genai` 2.4, dependabot bumps (ws, brace-expansion)

📦 **npm**: [`mulmocast@2.6.16`](https://www.npmjs.com/package/mulmocast/v/2.6.16)

## [2.6.15](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.15) (2026-05-18)

- **Puppeteer 25**: upgraded to `puppeteer ^25.0.3`. The earlier Chrome-version mismatch (puppeteer 25 vs `mulmocast-vision@1.0.9`'s puppeteer-core 24) is resolved by `mulmocast-vision@1.0.10`, which supports puppeteer 25 — both now dedupe to a single puppeteer-core 25 / Chrome version
- **Type-safe puppeteer imports**: switched to the named `import { type Page }` export required by puppeteer 25
- **Dependency updates**: Routine package updates (PRs #1379, #1380)

📦 **npm**: [`mulmocast@2.6.15`](https://www.npmjs.com/package/mulmocast/v/2.6.15)

## [2.6.14](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.14) (2026-05-12)

- **Fix `html_render.ts` for puppeteer's stricter waitUntil types**: `page.setContent()` no longer accepts `"networkidle0"` in puppeteer's updated types. Route HTML needing network-idle through the `page.goto` path so external image loads are still waited for properly
- **Dependency updates**: Routine package updates (PRs #1375, #1376, #1377)

📦 **npm**: [`mulmocast@2.6.14`](https://www.npmjs.com/package/mulmocast/v/2.6.14)

## [2.6.13](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.13) (2026-05-11)

- **`setMulmoErrorFormatter` injection point**: Host apps can now register a formatter that turns the schema validation error into a readable summary before `initializeContextFromFiles` logs it (default behavior unchanged when no formatter is registered or the formatter returns `null`)

📦 **npm**: [`mulmocast@2.6.13`](https://www.npmjs.com/package/mulmocast/v/2.6.13)

## [2.6.12](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.12) (2026-05-11)

- **fluent-ffmpeg → @modernized/fluent-ffmpeg**: Migrated to a TypeScript-native fork with bundled type definitions. Verified e2e across 7 movie scenarios (BGM trim, audio mixing, ducking, animation, movie embed, voice over, spillover)
- **Remove deprecated Imagen 3 / 4**: Reject `imagen-3.0-*` / `imagen-4.0-*` upfront with migration hint; consolidate Vertex AI global-only image model list in `provider2agent.ts`
- **@google/genai 1.50.1 → 2.0.1**: Major bump; breaking changes limited to Interactions API (our usage unaffected)
- **@tavily/core 0.5.14 → 0.7.3**: Additive changes only
- **Dependency updates**: Routine package updates

📦 **npm**: [`mulmocast@2.6.12`](https://www.npmjs.com/package/mulmocast/v/2.6.12)

## [2.6.11](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.11) (2026-05-08)

- **Remove deprecated DALL-E models**: Reject `dall-e-2` / `dall-e-3` upfront in OpenAI image agent with a clear deprecation hint pointing to `gpt-image-1` / `gpt-image-2`
- **Dependency updates**: Routine package updates

📦 **npm**: [`mulmocast@2.6.11`](https://www.npmjs.com/package/mulmocast/v/2.6.11)

## [2.6.10](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.10) (2026-04-30)

- **Replicate image models**: Added Flux 2 Pro/Dev, Flux 1.1 Pro/Pro Ultra, Flux Pro/Dev/Schnell, Ideogram v3 (turbo/balanced/quality), Recraft v3, Stable Diffusion 3.5 Large, Luma Photon. Generalized agent output handling
- **Replicate movie models**: Added `alibaba/happyhorse-1.0`, `minimax/hailuo-2.3`, `minimax/hailuo-2.3-fast`, `pixverse/pixverse-v5` with `start_image_required` flag for i2v-only models
- **Vertex AI usability**: Clearer auth error message and `gemini-3-pro-image-preview` region warn
- **Docs**: Added Gemini API vs Vertex AI section and links in `docs/README.md`

📦 **npm**: [`mulmocast@2.6.10`](https://www.npmjs.com/package/mulmocast/v/2.6.10)

## [2.6.9](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.9) (2026-04-28)

- **`gpt-image-2` support**: Added OpenAI `gpt-image-2` to image providers
- **`tts_google_agent` error surfacing**: Surface gRPC `.details` in thrown errors with proper `ServiceError` type and timeout handling
- **Docs**: Split Veo Replicate model table to show `lastFrame` parameter accurately
- **Dependency updates**: Routine package updates

📦 **npm**: [`mulmocast@2.6.9`](https://www.npmjs.com/package/mulmocast/v/2.6.9)

## [2.6.8](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.8) (2026-04-20)

- **Generate audio for video models**: `generateAudio` support for video generation models (Veo, Seedance 2.0, Pixverse v4.5). Modeled as a discriminated union so audio capability is explicit per model
- **Seedance 2.0 models**: Added Seedance 2.0 model configuration and test scenarios
- **Dependency updates**: yarn upgrade (patch/minor) plus dependabot bumps (`protobufjs`, `hono`, `basic-ftp`)

📦 **npm**: [`mulmocast@2.6.8`](https://www.npmjs.com/package/mulmocast/v/2.6.8)

## [2.6.7](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.7) (2026-04-13)

- **Configurable concurrency**: `concurrency` parameter for `imageParams`, `movieParams`, and `audioParams` to prevent rate limit errors (e.g., Veo 3 multi-beat generation)
- **Default background color**: Added default background for slides/charts
- **Refactor**: Unified graph option creation (`imageGraphOption` / `audioGraphOption`), extracted `createGraphOption` helper
- **Package updates**: Multiple dependency updates

📦 **npm**: [`mulmocast@2.6.7`](https://www.npmjs.com/package/mulmocast/v/2.6.7)

## [2.6.6](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.6) (2026-04-03)

- **Audio mixing controls**: `movieVolume`, `ttsVolume`, `ducking` parameters for controlling movie audio / TTS narration balance. Auto-reduce movie audio during narration with ducking
- **Replicate new models**: Grok Imagine Video/R2V, RunwayML Gen 4.5, Kling v3 Omni/Video, Veo 3.1/3.1-fast on Replicate
- **Veo 3.1 Lite**: `google/veo-3.1-lite` support (Replicate $0.05/sec, GenAI `veo-3.1-lite-generate-preview`). Supports lastFrame interpolation
- **Replicate reference images**: `reference_images` parameter support for Veo 3.1, Grok Imagine R2V, Kling v3 on Replicate
- **Duration spec fixes**: Corrected Veo 2.0 (removed 7s) and Veo 3.0 (8s only). Added `supportsDuration` capability
- **Fix**: Avoid slow-regex patterns in html_tailwind path handling
- **Circular dependency fix**: Extracted `graphOption` to break images.ts ↔ image_references.ts cycle
- **ESLint no-cycle**: Added `eslint-plugin-import` with `import/no-cycle` rule
- **Three.js samples**: Three.js animation samples with relative modelUrl resolution

📦 **npm**: [`mulmocast@2.6.6`](https://www.npmjs.com/package/mulmocast/v/2.6.6)

## [2.6.5](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.5) (2026-03-22)

- **imagePrompt reference images**: `referenceImageName` (reference another imageRefs key) and `referenceImage` (direct source) for image-to-image generation in `imageParams.images`

📦 **npm**: [`mulmocast@2.6.5`](https://www.npmjs.com/package/mulmocast/v/2.6.5)

## [2.6.4](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.4) (2026-03-20)

- **Chart.js plugins**: Sankey (`chartjs-chart-sankey`) and Treemap (`chartjs-chart-treemap`) auto-loaded by chart type
- **Waterfall slide layout**: Dedicated Slide DSL layout for profit bridge / YoY change analysis
- **Chart backgroundImage/style**: `backgroundImage` and `style` fields added to chart plugin
- **Mermaid image/movie refs**: `image:name` and `movie:name` references in mermaid backgrounds
- **Movie reference images**: `firstFrameImageName`, `lastFrameImageName`, and `referenceImages` for Veo 3.1 and Replicate models
- **Model capabilities**: `provider2agent.ts` defines per-model feature support with warnings for unsupported/exclusive options

📦 **npm**: [`mulmocast@2.6.4`](https://www.npmjs.com/package/mulmocast/v/2.6.4)

## [2.6.3](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.3) (2026-03-17)

- **Animated PDF final frame**: Animated `html_tailwind` beats now render a high-quality static image of the final frame directly from HTML for PDF/thumbnail use, fixing missing content in PDF output
- **Beat-level local media references**: `beat.images` for defining image/movie references scoped to individual beats

📦 **npm**: [`mulmocast@2.6.3`](https://www.npmjs.com/package/mulmocast/v/2.6.3)

## [2.6.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.2) (2026-03-16)

- **Fix**: Beats with `moviePrompt` and empty `text` no longer cause the previous beat's video to be cut short (#1295)

📦 **npm**: [`mulmocast@2.6.2`](https://www.npmjs.com/package/mulmocast/v/2.6.2)

## [2.6.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.1) (2026-03-16)

- **Movie media references**: `movie` type in `imageParams.images` for video file references with `movie:name` resolution in html_tailwind and markdown plugins
- **Video rendering in Puppeteer**: `<video>` elements now work in HTML rendering — video load waiting, frame-sync seeking, and screencast playback
- **Markdown image refs**: `image:name` references now supported in the markdown plugin

📦 **npm**: [`mulmocast@2.6.1`](https://www.npmjs.com/package/mulmocast/v/2.6.1)

## [2.6.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.6.0) (2026-03-15)

- **Swipe-style Declarative Animation Elements**: html_tailwind beatに`elements`配列を追加。Swipe言語仕様にインスパイアされた宣言的JSONでアニメーションを定義可能。7種のループアニメーション（wiggle, vibrate, bounce, pulse, blink, spin, shift）とトランジションアニメーションをサポート

📦 **npm**: [`mulmocast@2.6.0`](https://www.npmjs.com/package/mulmocast/v/2.6.0)

## [2.5.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.5.0) (2026-03-15)

- **Animation Runtime Extraction**: Extracted animation runtime JS from HTML template into separate, testable files (`animation_runtime.js`, `data_attribute_registration.js`, `auto_render.js`)
- **Data-Attribute Declarative Animations**: New `[data-animation]` HTML attributes for declaring animations without writing script code
- **Cover Pan/Zoom**: New `coverPan()` and `coverZoom()` animation helpers for Ken Burns-style photo effects
- **Per-Image canvasSize**: `imagePrompt` reference images now support optional `canvasSize` for per-image aspect ratio override
- **Browser JS Quality**: ESLint, Prettier, and CI syntax checks for `assets/html/js/` files; var→const/let modernization

📦 **npm**: [`mulmocast@2.5.0`](https://www.npmjs.com/package/mulmocast/v/2.5.0)

## [2.4.9](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.9) (2026-03-12)

- **CDP Screencast for animations**: Use Chrome DevTools Protocol screencast for html_tailwind animation recording, with toggle to switch between frame-by-frame and CDP screencast modes

📦 **npm**: [`mulmocast@2.4.9`](https://www.npmjs.com/package/mulmocast/v/2.4.9)

## [2.4.8](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.8) (2026-03-07)

- **image: URL scheme**: Added `image:` URL scheme to reference `imageParams.images` in html_tailwind beats (e.g., `src="image:logo"`)
- **Caption HTML tag stripping**: Fixed caption timing calculation to properly strip HTML tags from text length estimation

📦 **npm**: [`mulmocast@2.4.8`](https://www.npmjs.com/package/mulmocast/v/2.4.8)

## [2.4.7](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.7) (2026-03-05)

- **Caption bottomOffset**: Added `bottomOffset` option to `captionParams` to position captions higher (e.g., 20% from bottom) to avoid overlapping with YouTube player controls

📦 **npm**: [`mulmocast@2.4.7`](https://www.npmjs.com/package/mulmocast/v/2.4.7)

## [2.4.6](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.6) (2026-03-02)

- **Relative image paths in html_tailwind**: Relative `src` paths in html_tailwind beats are now automatically resolved to `file://` absolute paths based on the script file's directory, making scripts portable across environments

📦 **npm**: [`mulmocast@2.4.6`](https://www.npmjs.com/package/mulmocast/v/2.4.6)

## [2.4.5](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.5) (2026-03-02)

- **Gemini 3.1 Flash Image**: Added `gemini-3.1-flash-image-preview` model support for Google image generation

📦 **npm**: [`mulmocast@2.4.5`](https://www.npmjs.com/package/mulmocast/v/2.4.5)

## [2.4.4](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.4) (2026-03-02)

- **Gemini 3.1 Pro**: Updated Gemini LLM model from `gemini-3-pro-preview` to `gemini-3.1-pro-preview`
- **Learning skills**: Added 4 sample Claude Code skills for educational content (vocab-chat, vocab-lesson, conversation-chat, stroke-order)
- **Changelog**: Added `CHANGELOG.md`, `CHANGELOG-1.x.md`, `CHANGELOG-0.x.md` covering all releases

📦 **npm**: [`mulmocast@2.4.4`](https://www.npmjs.com/package/mulmocast/v/2.4.4)

## [2.4.3](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.3) (2026-03-01)

- **Video-Audio Drift Fix**: Fixed cumulative audio-video desync caused by FFmpeg's `trim=duration` rounding up to frame boundaries (~0.03s per beat). Now uses frame-exact trimming with cumulative frame tracking (Bresenham-style) for precise synchronization.

📦 **npm**: [`mulmocast@2.4.3`](https://www.npmjs.com/package/mulmocast/v/2.4.3)


## [2.4.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.2) (2026-02-28)

- **3D CSS Rotation**: `rotateX`, `rotateY`, `rotateZ` properties now supported in MulmoAnimation DSL — enables perspective-based 3D effects like card flips and cinematic title reveals
- **`end: 'auto'`**: New option for `animate`, `typewriter`, `counter`, `codeReveal` — automatically uses the beat's total duration, ideal for full-beat scrolling animations
- **New animation samples**: 3D card flip, cinematic title reveal, split reveal demos + 5 mulmocast_* sample scripts

**Samples**: [`scripts/samples/mulmocast_starwars_en.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/samples/mulmocast_starwars_en.json)

📦 **npm**: [`mulmocast@2.4.2`](https://www.npmjs.com/package/mulmocast/v/2.4.2)


## [2.4.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.1) (2026-02-27)

- **Fix: Animated PDF output**: Animated `html_tailwind` beats now correctly show the completed animation state in PDF output instead of blank pages

📦 **npm**: [`mulmocast@2.4.1`](https://www.npmjs.com/package/mulmocast/v/2.4.1)


## [2.4.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.4.0) (2026-02-27)

- **MulmoAnimation DSL Enhancement**: Added `codeReveal` (line-by-line code reveal), `blink` (periodic show/hide toggle), and auto-render support — no more boilerplate `render()` functions needed
- **HTML Animation Script Field**: Separated `script` from `html` in `html_tailwind` beats for cleaner code organization
- **Frame-Based Animation**: Full Puppeteer + FFmpeg frame-based animation pipeline for `html_tailwind` beats with deterministic rendering
- **Story Skill Improvements**: Added BGM auto-selection, orientation (landscape/portrait) support, and `--grouped` output flag
- **Portrait Video Support**: Updated portrait size to 1080x1920 for YouTube Shorts
- **TypeScript 6.0.0-beta**: Upgraded TypeScript compiler

**Sample**: [`scripts/test/test_html_animation.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_html_animation.json)

📦 **npm**: [`mulmocast@2.4.0`](https://www.npmjs.com/package/mulmocast/v/2.4.0) | [`@mulmocast/types@2.4.0`](https://www.npmjs.com/package/@mulmocast/types/v/2.4.0)


## [2.3.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.3.2) (2026-02-25)

- **Config path resolution fix**: `kind: "path"` entries in `mulmo.config.json` are now resolved relative to the **script file directory**, consistent with all other path resolution in MulmoScript
- **README updated**: All CLI help output refreshed to match current implementation (new options, templates, languages)
- **BGM in config sample**: `mulmo.config.json.sample` now includes BGM default (story001.mp3)

📦 **npm**: [`mulmocast@2.3.2`](https://www.npmjs.com/package/mulmocast/v/2.3.2)


## [2.3.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.3.1) (2026-02-25)

- **`--grouped` option**: New `-g` / `--grouped` flag outputs all generated files (audio, images, video, studio JSON) under `output/<basename>/` directory instead of scattering across `output/`
- **Audio path refactoring**: Extracted `formatAudioFileName` and `getGroupedAudioFilePath` utilities to deduplicate lang suffix logic

📦 **npm**: [`mulmocast@2.3.1`](https://www.npmjs.com/package/mulmocast/v/2.3.1)


## [2.3.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.3.0) (2026-02-25)

- **mulmo.config.json override**: Added `override` key to `mulmo.config.json` that takes priority over script values, enabling enterprise-wide branding and TTS provider enforcement. Also added `mulmo tool info merged` command to preview the merged result.
- **Slide default theme**: Slides now fallback to `corporate` theme when no theme is specified, instead of throwing an error.

**Sample config**: [`mulmo.config.json.sample`](https://github.com/receptron/mulmocast-cli/blob/main/mulmo.config.json.sample)

📦 **npm**: [`mulmocast@2.3.0`](https://www.npmjs.com/package/mulmocast/v/2.3.0)


## [2.2.6](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.6) (2026-02-23)

- **Slide Branding**: Global logo and background image settings applied to all slides automatically, like a slide master. Per-beat disable (`branding: null`) and override supported
- **bgOpacity**: Added `bgOpacity` option to control slide background color opacity, enabling transparent background images

📦 **npm**: [`mulmocast@2.2.6`](https://www.npmjs.com/package/mulmocast/v/2.2.6)
📦 **npm**: [`@mulmocast/types@2.3.0`](https://www.npmjs.com/package/@mulmocast/types/v/2.3.0)


## [2.2.5](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.5) (2026-02-23)

- **`tool info themes`**: Retrieve slide theme information (theme name, colors, fonts) from CLI (`mulmo tool info themes`)

📦 **npm**: [`mulmocast@2.2.5`](https://www.npmjs.com/package/mulmocast/v/2.2.5)


## [2.2.4](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.4) (2026-02-22)

- **`mulmocast` CLI alias**: `npx mulmocast@latest movie ...` now works directly (added `mulmocast` as bin alias alongside existing `mulmo`)

📦 **npm**: [`mulmocast@2.2.4`](https://www.npmjs.com/package/mulmocast/v/2.2.4)


## [2.2.3](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.3) (2026-02-22)

- **Table Content Block**: Embed tables inside any layout (split, columns, comparison, etc.) as inline content blocks
- **Slide DSL Rich Content Extensions**: Enhanced content block system with shared schemas, improved section rendering
- **Story Skill Improvements**: Simplified movie generation workflow (`yarn movie` handles everything)

📦 **npm**: [`mulmocast@2.2.3`](https://www.npmjs.com/package/mulmocast/v/2.2.3)


## [2.2.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.2) (2026-02-20)

- **Card layout vertical spacing fix**: Removed `justify-center` from comparison/columns card layouts to flow content naturally from top, with footer pinned to bottom via `mt-auto`
- **Card height optimization**: Changed `items-stretch` to `items-start` so cards size to their content instead of stretching to fill available space
- **Slide layout improvements**: Improved vertical centering and spacing across slide layouts
- **Story skill**: Added `/story` skill for structured multi-phase MulmoScript creation
- **Slide reference**: Added reference field to slide media for beat-level citations
- **Slide chart & mermaid**: Added chart and mermaid content block types to slide DSL
- **TTS speed option**: Added TTS speed configuration support

📦 **npm**: [`mulmocast@2.2.2`](https://www.npmjs.com/package/mulmocast/v/2.2.2)


## [2.2.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.1) (2026-02-19)

- Add missing assets to npm package: `assets/schemas/`, `assets/slide_themes/`, `assets/styles/`
- Export `slideThemes` and `slideStyles` as compiled data via `mulmocast/data`
- Add `./tools/complete_script` to exports map

📦 **npm**: [`mulmocast@2.2.1`](https://www.npmjs.com/package/mulmocast/v/2.2.1)


## [2.2.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.2.0) (2026-02-19)

- **Slide imageRef Content Block**: New `imageRef` content block type that references images from `imageRefs` in MulmoScript, enabling reusable image assets across slide layouts
- **Chart Content Block**: Embed Chart.js charts (bar, pie, line, etc.) directly inside slide content blocks with conditional CDN loading
- **Mermaid Content Block**: Embed Mermaid diagrams (flowcharts, sequence diagrams, etc.) inside slide content blocks with automatic dark/light theme detection

**Sample**: [`test_slide_chart_mermaid.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_slide_chart_mermaid.json) | [`test_slide_image_ref.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_slide_image_ref.json)

📦 **npm**: [`mulmocast@2.2.0`](https://www.npmjs.com/package/mulmocast/v/2.2.0)


## [2.1.40](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.40) (2026-02-18)

- **Slide Image Plugin**: New `type: "slide"` image plugin for structured JSON slide rendering with 11 layouts, 7 content block types, 13-color theme system, and 6 preset themes
- **ElevenLabs eleven_v3 Model Support**: Added support for the new ElevenLabs eleven_v3 TTS model
- **Documentation**: Comprehensive slide plugin documentation across README, image docs, feature docs, and plugin architecture docs

📦 **npm**: [`mulmocast@2.1.40`](https://www.npmjs.com/package/mulmocast/v/2.1.40) / [`@mulmocast/types@2.1.40`](https://www.npmjs.com/package/@mulmocast/types/v/2.1.40)


## [2.1.39](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.39) (2026-02-16)

- **ElevenLabs eleven_v3 Model Support**: Added support for the new ElevenLabs eleven_v3 TTS model

📦 **npm**: [`mulmocast@2.1.39`](https://www.npmjs.com/package/mulmocast/v/2.1.39)


## [2.1.38](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.38) (2026-02-13)

- **Beat ID in viewer bundle**: Include beat `id` in `MulmoViewerBeat` schema and bundle output for easier beat identification in viewer apps
- **Session state safety**: Improved `setBeatSessionState` with `Object.hasOwn` guard to prevent accessing undefined session types

📦 **npm**: [`mulmocast@2.1.38`](https://www.npmjs.com/package/mulmocast/v/2.1.38)


## [2.1.37](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.37) (2026-02-12)

- **Viewer types refactored**: Separated `MulmoViewerBeat`/`MulmoViewerData` into dedicated `viewer.ts` with Zod schema validation
- **Cross-platform CI**: Added Windows and macOS CI runners alongside existing Ubuntu

📦 **npm**: [`mulmocast@2.1.37`](https://www.npmjs.com/package/mulmocast/v/2.1.37)


## [2.1.36](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.36) (2026-02-12)

- **Align viewer types**: Add `importance`, `bgmFile`, `lang` fields and fix `audioSources` type in `MulmoViewerData`/`MulmoViewerBeat` to match mulmocast-viewer

📦 **npm**: [`mulmocast@2.1.36`](https://www.npmjs.com/package/mulmocast/v/2.1.36)


## [2.1.35](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.35) (2026-02-04)

- **CLI export fix**: Separate `cliMain` function to prevent auto-execution when imported as library

📦 **npm**: [`mulmocast@2.1.35`](https://www.npmjs.com/package/mulmocast/v/2.1.35)


## [2.1.34](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.34) (2026-02-04)

- **CLI export fix**: Separate `cliMain` function to prevent auto-execution when imported as library

📦 **npm**: [`mulmocast@2.1.34`](https://www.npmjs.com/package/mulmocast/v/2.1.34)


## [2.1.33](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.33) (2026-02-04)

- **cliMain export**: CLI main function is now exported for programmatic usage (e.g., `mulmocast-easy`)

📦 **npm**: [`mulmocast@2.1.33`](https://www.npmjs.com/package/mulmocast/v/2.1.33)


## [2.1.32](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.32) (2026-02-04)

- **Mermaid Background Image Support**: Added `backgroundImage` and `style` properties to mermaid type for beautiful diagram slides
- **Timeout Fix**: Fixed timeout issue when markdown contains mermaid code block with backgroundImage

📦 **npm**: [`mulmocast@2.1.32`](https://www.npmjs.com/package/mulmocast/v/2.1.32)


## [2.1.31](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.31) (2026-02-03)

- **Background Image Support**: Added `backgroundImage` property to markdown and textSlide for stunning visual backgrounds with opacity control

📦 **npm**: [`mulmocast@2.1.31`](https://www.npmjs.com/package/mulmocast/v/2.1.31)


## [2.1.30](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.30) (2026-02-01)

- **TextSlide Style Support**: Added `style` property to textSlide for customizable slide designs
- **Mermaid in Markdown**: Support mermaid code blocks directly in markdown content
- **External Image Detection**: Improved rendering reliability with automatic external image detection

📦 **npm**: [`mulmocast@2.1.30`](https://www.npmjs.com/package/mulmocast/v/2.1.30)


## [2.1.29](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.29) (2026-01-30)

- **100 Markdown Slide Styles**: Added 100 pre-designed markdown slide styles for beautiful presentations
- **Tool Info Command**: New `mulmo tool info` command to discover available voices, styles, templates, and more

📦 **npm**: [`mulmocast@2.1.29`](https://www.npmjs.com/package/mulmocast/v/2.1.29)


## [2.1.28](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.28) (2026-01-30)

- **Chart.js Rendering Fix**: Added proper rendering detection for Chart.js, ensuring charts are fully rendered before screenshot
- **Background Fill Fix**: Fixed background not filling viewport in screenshot rendering
- **Animation Disabled**: Disabled Chart.js animations for reliable static chart rendering

📦 **npm**: [`mulmocast@2.1.28`](https://www.npmjs.com/package/mulmocast/v/2.1.28)


## [2.1.27](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.27) (2026-01-29)

- **Puppeteer optimization**: Reuse browser instance for HTML-to-image rendering to reduce Chrome launches

📦 **npm**: [`mulmocast@2.1.27`](https://www.npmjs.com/package/mulmocast/v/2.1.27)


## [2.1.26](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.26) (2026-01-29)

- **Tool complete style option**: Added style option to `tool complete` command

📦 **npm**: [`mulmocast@2.1.26`](https://www.npmjs.com/package/mulmocast/v/2.1.26)


## [2.1.25](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.25) (2026-01-29)

- **Tool Complete Command**: New `mulmo tool complete` command for automated MulmoScript completion
- **Azure OpenAI for Scripting**: Extended Azure OpenAI support to scripting tools
- **Caption Params Fix**: Fixed caption parameters merge behavior

📦 **npm**: [`mulmocast@2.1.25`](https://www.npmjs.com/package/mulmocast/v/2.1.25)


## [2.1.24](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.24) (2026-01-28)

- **Gemini 3 Models Support**: Added support for the latest Gemini 3 models
- **Imagen 4 GA**: Updated to GA versions of Imagen 4 models
- **Vertex AI Integration**: Added Vertex AI support for Google image and movie agents

📦 **npm**: [`mulmocast@2.1.24`](https://www.npmjs.com/package/mulmocast/v/2.1.24)


## [2.1.23](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.23) (2026-01-28)

- **Azure OpenAI Support**: Added Azure OpenAI support for image generation and translation

📦 **npm**: [`mulmocast@2.1.23`](https://www.npmjs.com/package/mulmocast/v/2.1.23)


## [2.1.22](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.22) (2026-01-26)

- **Maintenance release**: Package updates

📦 **npm**: [`mulmocast@2.1.22`](https://www.npmjs.com/package/mulmocast/v/2.1.22)


## [2.1.21](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.21) (2026-01-26)

- **Caption splitting**: Split captions by sentence delimiters for better readability
- **Transition refactor**: Refactored transition duration calculation with unit tests

📦 **npm**: [`mulmocast@2.1.21`](https://www.npmjs.com/package/mulmocast/v/2.1.21)


## [2.1.20](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.20) (2026-01-26)

- **Remove nijivoice**: Removed nijivoice TTS provider

📦 **npm**: [`mulmocast@2.1.20`](https://www.npmjs.com/package/mulmocast/v/2.1.20)


## [2.1.19](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.19) (2026-01-25)

- **Transition fix**: Fixed transition static frame duration to prevent end-credit freeze
- **ESLint cleanup**: Resolved ESLint warnings

📦 **npm**: [`mulmocast@2.1.19`](https://www.npmjs.com/package/mulmocast/v/2.1.19)


## [2.1.18](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.18) (2026-01-23)

- **Model deprecation notice**: Added deprecation announcements for upcoming model shutdowns

📦 **npm**: [`mulmocast@2.1.18`](https://www.npmjs.com/package/mulmocast/v/2.1.18)


## [2.1.17](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.17) (2026-01-17)

- **Gemini TTS**: Support Gemini TTS models in Google Cloud TTS agent

📦 **npm**: [`mulmocast@2.1.17`](https://www.npmjs.com/package/mulmocast/v/2.1.17)


## [2.1.16](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.16) (2026-01-07)

- **OpenAI TTS speed**: Added speed parameter support to OpenAI TTS agent
- **Claude model update**: Updated to Claude Sonnet 4.5
- **Bundle skip-zip**: Added skip zip option to bundle command

📦 **npm**: [`mulmocast@2.1.16`](https://www.npmjs.com/package/mulmocast/v/2.1.16)


## [2.1.15](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.15) (2025-12-25)

- **Portrait image**: Added portrait credit image support

📦 **npm**: [`mulmocast@2.1.15`](https://www.npmjs.com/package/mulmocast/v/2.1.15)


## [2.1.14](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.14) (2025-12-24)

- **Bundle BGM fix**: Fixed BGM handling in bundle command

📦 **npm**: [`mulmocast@2.1.14`](https://www.npmjs.com/package/mulmocast/v/2.1.14)


## [2.1.13](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.13) (2025-12-23)

- **Template update**: Updated presentation templates

📦 **npm**: [`mulmocast@2.1.13`](https://www.npmjs.com/package/mulmocast/v/2.1.13)


## [2.1.12](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.12) (2025-12-23)

- **Aspect ratio refactor**: Improved aspect ratio handling, including NanoBanana support

📦 **npm**: [`mulmocast@2.1.12`](https://www.npmjs.com/package/mulmocast/v/2.1.12)


## [2.1.11](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.11) (2025-12-22)

- **View JSON title**: Added title to mulmo view JSON output

📦 **npm**: [`mulmocast@2.1.11`](https://www.npmjs.com/package/mulmocast/v/2.1.11)


## [2.1.10](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.10) (2025-12-22)

- **Gemini TTS instruction**: Added instruction support for Gemini TTS

📦 **npm**: [`mulmocast@2.1.10`](https://www.npmjs.com/package/mulmocast/v/2.1.10)


## [2.1.9](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.9) (2025-12-21)

- **Bundle audio fix**: Fixed audio handling in bundle command

📦 **npm**: [`mulmocast@2.1.9`](https://www.npmjs.com/package/mulmocast/v/2.1.9)


## [2.1.8](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.8) (2025-12-17)

- **ElevenLabs TTS tuning**: Added stability and similarity_boost support for ElevenLabs TTS
- **GPT Image 1.5**: Added support for gpt-image-1.5 model

📦 **npm**: [`mulmocast@2.1.8`](https://www.npmjs.com/package/mulmocast/v/2.1.8)


## [2.1.7](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.7) (2025-12-12)

- **Kotodama cache fix**: Fixed caching for Kotodama TTS

📦 **npm**: [`mulmocast@2.1.7`](https://www.npmjs.com/package/mulmocast/v/2.1.7)


## [2.1.6](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.6) (2025-12-11)

- **Gemini voice**: Added Gemini voice support
- **Voice limit error**: Improved error handling for voice_limit_reached

📦 **npm**: [`mulmocast@2.1.6`](https://www.npmjs.com/package/mulmocast/v/2.1.6)


## [2.1.5](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.5) (2025-12-11)

- **Gemini TTS**: Added support for gemini-2.5-pro-preview-tts

📦 **npm**: [`mulmocast@2.1.5`](https://www.npmjs.com/package/mulmocast/v/2.1.5)


## [2.1.4](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.4) (2025-12-11)

- **BGM music**: Added BGM (background music) support

📦 **npm**: [`mulmocast@2.1.4`](https://www.npmjs.com/package/mulmocast/v/2.1.4)


## [2.1.3](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.3) (2025-12-10)

- **Wipe transition fix**: Fixed wipe transition to complete full 0-100% and auto-limit duration

📦 **npm**: [`mulmocast@2.1.3`](https://www.npmjs.com/package/mulmocast/v/2.1.3)


## [2.1.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.2) (2025-12-09)

- **Wipe transition offset fix**: Corrected wipe transition offset calculation

📦 **npm**: [`mulmocast@2.1.2`](https://www.npmjs.com/package/mulmocast/v/2.1.2)


## [2.1.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.1) (2025-12-08)

- Video filters


## [2.1.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.1.0) (2025-12-08)

- Beat transition
- Transition
- Transition refactor
- Create video test
- findMissingIndex and VideoId
- Wipe transitions


## [2.0.9](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.9) (2025-12-06)

- **API key refactor**: Cleaned up API key handling
- **Dependency updates**: Security and package updates

📦 **npm**: [`mulmocast@2.0.9`](https://www.npmjs.com/package/mulmocast/v/2.0.9)


## [2.0.8](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.8) (2025-11-28)

- **Kotodama TTS**: Added Kotodama TTS support (https://kotodama.go-spiral.ai/)

📦 **npm**: [`mulmocast@2.0.8`](https://www.npmjs.com/package/mulmocast/v/2.0.8)


## [2.0.7](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.7) (2025-11-28)

- **Error handling improvements**: Better error handling for Gemini, ElevenLabs, and Replicate APIs
- **Aspect ratio refactor**: Improved aspect ratio handling
- **Documentation**: Added TTS docs, feature.md, and script index

📦 **npm**: [`mulmocast@2.0.7`](https://www.npmjs.com/package/mulmocast/v/2.0.7)


## [2.0.6](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.6) (2025-11-27)

- **Long Gemini video**: Improved support for long Gemini video generation

📦 **npm**: [`mulmocast@2.0.6`](https://www.npmjs.com/package/mulmocast/v/2.0.6)


## [2.0.5](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.5) (2025-11-25)

- **NanoBanana aspect ratio**: Added aspect ratio support for NanoBanana

📦 **npm**: [`mulmocast@2.0.5`](https://www.npmjs.com/package/mulmocast/v/2.0.5)


## [2.0.4](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.4) (2025-11-25)

- **Gemini TTS**: Added Gemini TTS support

📦 **npm**: [`mulmocast@2.0.4`](https://www.npmjs.com/package/mulmocast/v/2.0.4)


## [2.0.3](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.3) (2025-11-21)

- **GPT Image 1 Mini**: Added gpt-image-1-mini support
- **GenAI model updates**: Updated generative AI models
- **Lip sync docs**: Documented lip sync model inputs
- **Bundle improvements**: Updated bundle data format and help

📦 **npm**: [`mulmocast@2.0.3`](https://www.npmjs.com/package/mulmocast/v/2.0.3)


## [2.0.2](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.2) (2025-11-17)

- **Sound effect & lip sync params**: Added MulmoSoundEffectParams and MulmoLipSyncParams schema types
- **CI update**: Improved CI configuration

📦 **npm**: [`mulmocast@2.0.2`](https://www.npmjs.com/package/mulmocast/v/2.0.2)


## [2.0.1](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.1) (2025-11-16)

- **MoviePrompt with images**: MoviePrompt now supports local and remote images for video generation from static images

📦 **npm**: [`mulmocast@2.0.1`](https://www.npmjs.com/package/mulmocast/v/2.0.1)


## [2.0.0](https://github.com/receptron/mulmocast-cli/releases/tag/2.0.0) (2025-11-08)

- **Zod v4 migration**: Breaking change — updated internal JSON validation library from Zod v3 to Zod v4

📦 **npm**: [`mulmocast@2.0.0`](https://www.npmjs.com/package/mulmocast/v/2.0.0)

