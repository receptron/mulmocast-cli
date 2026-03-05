# Changelog

All notable changes to this project will be documented in this file.

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

