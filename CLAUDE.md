# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MulmoCast is an AI-native multi-modal presentation platform that transforms content into videos, podcasts, PDFs, and other formats. The core workflow involves creating MulmoScript (JSON-based content descriptions) and using GraphAI to orchestrate various AI agents for content generation.

## Development Commands

### Build & Development
```bash
yarn build                    # Compile TypeScript to lib/ directory
yarn build_test              # Build and checkout lib/ files to prevent accidental commits
yarn lint                    # Run ESLint on src/ and test/
yarn format                  # Format code with Prettier
yarn ci_test                 # Run Node.js native test runner
```

### Core CLI Commands
```bash
yarn cli                     # Run the CLI directly with npx tsx
yarn test                    # Run end-to-end test (generates test files)

# Content generation shortcuts
yarn audio <script>          # Generate audio from MulmoScript
yarn images <script>         # Generate images from MulmoScript  
yarn movie <script>          # Generate complete video from MulmoScript
yarn translate <script>      # Translate MulmoScript to different languages
yarn pdf <script>            # Generate PDF from MulmoScript

# Tools and utilities
yarn scripting              # Interactive script generation
yarn prompt                 # Dump prompt templates
yarn schema                 # Output MulmoScript schema
yarn story_to_script        # Convert story to MulmoScript
```

### Publishing

This repository contains two npm packages:
- **Root** (`mulmocast`): The main CLI package
- **`types/`** (`@mulmocast/types`): Shared type definitions (symlinks to `src/types/`)

When publishing, if the diff includes changes under `src/types/`, MUST publish `types/` package as well. Both packages use the `/publish` skill.

## Architecture Overview

### Core Components

**GraphAI-Based Processing Pipeline**: The system uses GraphAI as the orchestration engine, with custom agents for different AI services and media processing tasks.

**MulmoScript Format**: JSON-based intermediate language that describes multi-modal content with beats (content segments), speakers, media sources, and presentation styles.

**Multi-Provider AI Integration**: Supports multiple AI providers for different tasks:
- Text-to-Speech: OpenAI, Google Cloud, ElevenLabs, Gemini
- Image Generation: OpenAI DALL-E, Google Imagen
- Video Generation: Replicate models

### Directory Structure

- `src/actions/` - Main processing actions (audio, images, movie, pdf, translate, captions)
- `src/agents/` - GraphAI custom agents for AI services and media processing
- `src/cli/` - CLI interface with command builders and handlers
- `src/methods/` - Schema-specific methods (see Methods Pattern below)
- `src/tools/` - Higher-level tools for script generation and research
- `src/types/` - TypeScript schemas and type definitions (core: schema.ts)
- `src/utils/` - Utilities for file handling, FFmpeg, image processing, etc.
- `src/utils/image_plugins/` - Image type processors (markdown, textSlide, mermaid, slide, etc.)
- `src/slide/` - Self-contained slide DSL module (schema, layouts, blocks, render)
- `.claude/skills/` - Sample skills for educational content generation (see below)

### Sample Skills (`.claude/skills/`)

The following skills are included as examples of how to build MulmoScript generation workflows using Claude Code skills:

| Skill | Description |
|-------|-------------|
| `vocab-chat` | Messenger-style vocabulary learning chat with voiceover |
| `vocab-lesson` | Multi-section vocabulary lesson (word display, examples, review with translation) |
| `conversation-chat` | Speech-bubble conversation practice with character illustration |
| `stroke-order` | Animated stroke order for hiragana, katakana, kanji, and Latin characters |

Each skill includes a `SKILL.md` with templates and helper scripts (timing calculators, generators).

### Methods Pattern (`src/methods/`)

Each Methods object contains functions that process the corresponding schema type. **When implementing data processing, first check if a relevant function exists in the Methods; if yes use it, if no add a new function to the appropriate Methods file.**

| Methods Object | Processes | Key Functions |
|----------------|-----------|---------------|
| `MulmoBeatMethods` | `MulmoBeat` | getPlugin, getHtmlPrompt |
| `MulmoMediaSourceMethods` | `MulmoMediaSource` | toDataUrl, getText, resolve, imageReference |
| `MulmoScriptMethods` | `MulmoScript` | validate (with version migration) |
| `MulmoStudioContextMethods` | `MulmoStudioContext` | getAudioDirPath, setSessionState, getAudioParam |
| `MulmoPresentationStyleMethods` | `MulmoPresentationStyle` | getSpeaker, getCanvasSize, getImageAgentInfo |

Example - processing MediaSource:
```typescript
import { MulmoMediaSourceMethods } from "../methods/mulmo_media_source.js";

// Convert to data URL (handles url/path/base64 automatically)
const dataUrl = await MulmoMediaSourceMethods.toDataUrl(mediaSource, context);

// Get text content (for mermaid code, etc.)
const text = await MulmoMediaSourceMethods.getText(mediaSource, context);
```

When adding new functionality:
1. Identify which schema type the data belongs to
2. Check if `Mulmo[Type]Methods` already has a suitable method
3. If not, add the method to the corresponding Methods file
4. Keep methods browser-compatible when possible (avoid Node.js built-ins like `fs`)

### Error Handling Pattern (`src/utils/error_cause.ts`)

Use structured error causes for i18n-friendly error messages. **Always add try/catch and timeout handling for fetch operations and external API calls.**

```typescript
import { mediaSourceToDataUrlError } from "../utils/error_cause.js";

// With timeout using AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, { signal: controller.signal });
  assert(response.ok, `Failed to fetch: ${url}`, false, mediaSourceToDataUrlError(url));
  // ... process response
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    throw new Error(`Fetch timeout: ${url}`, { cause: mediaSourceToDataUrlError(url) });
  }
  throw new Error(`Fetch failed: ${url}`, { cause: mediaSourceToDataUrlError(url) });
} finally {
  clearTimeout(timeoutId);
}
```

### Implementation Plans (`docs/plans/`)

Store implementation plans as markdown files before implementing complex features:
- `plan_<feature_name>.md` - Feature implementation plan
- Include: schema design, affected files, usage examples, implementation steps

### Key Workflows

1. **Script Generation**: Interactive or URL-based → LLM agents → MulmoScript JSON
2. **Audio Generation**: MulmoScript → TTS agents → Audio fragments → Combined audio
3. **Image Generation**: MulmoScript → Image generation agents → Scene images
4. **Video Assembly**: Audio + Images → FFmpeg processing → Final video
5. **Multi-format Output**: Same MulmoScript → PDF, captions, translations

### Configuration

The system uses environment variables for API keys and configuration. Required `.env` setup:
- `OPENAI_API_KEY` (required)
- Optional: `GOOGLE_PROJECT_ID`, `REPLICATE_API_TOKEN`, `ELEVENLABS_API_KEY`, `BROWSERLESS_API_TOKEN`

### File Handling Conventions

- Input: MulmoScript JSON files (typically in project root)
- Output: Generated in `output/` directory (gitignored)
- Caching: Previous generations are cached; use `-f` flag to force regeneration
- Templates: Asset templates in `assets/templates/` and `assets/styles/`

## Development Notes

- Uses TypeScript with strict mode
- ESM modules throughout
- GraphAI agents follow a consistent pattern with input/output schemas
- FFmpeg is used for video/audio processing
- Puppeteer for HTML-to-image conversion
- File operations use absolute paths and proper caching mechanisms

## Testing

The project uses Node.js native test runner. Tests are located in `test/` directory and can be run with `yarn ci_test`. The main end-to-end test (`yarn test`) generates actual content files to verify the complete pipeline.

### Running TypeScript Programs and Tests

Use `npx tsx` to run TypeScript files directly without compilation:
```bash
npx tsx src/path/to/file.ts      # Run TypeScript source files
npx tsx test/path/to/test.ts     # Run individual test files
```

This is preferred over compiling with `yarn build` when testing individual components or running single test files.