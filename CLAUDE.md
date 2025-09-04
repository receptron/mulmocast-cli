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

## Architecture Overview

### Core Components

**GraphAI-Based Processing Pipeline**: The system uses GraphAI as the orchestration engine, with custom agents for different AI services and media processing tasks.

**MulmoScript Format**: JSON-based intermediate language that describes multi-modal content with beats (content segments), speakers, media sources, and presentation styles.

**Multi-Provider AI Integration**: Supports multiple AI providers for different tasks:
- Text-to-Speech: OpenAI, Google Cloud, ElevenLabs, Nijivoice
- Image Generation: OpenAI DALL-E, Google Imagen
- Video Generation: Replicate models

### Directory Structure

- `src/actions/` - Main processing actions (audio, images, movie, pdf, translate, captions)
- `src/agents/` - GraphAI custom agents for AI services and media processing
- `src/cli/` - CLI interface with command builders and handlers
- `src/methods/` - Business logic for presentation styles, templates, and context handling
- `src/tools/` - Higher-level tools for script generation and research
- `src/types/` - TypeScript schemas and type definitions (core: schema.ts)
- `src/utils/` - Utilities for file handling, FFmpeg, image processing, etc.

### Key Workflows

1. **Script Generation**: Interactive or URL-based → LLM agents → MulmoScript JSON
2. **Audio Generation**: MulmoScript → TTS agents → Audio fragments → Combined audio
3. **Image Generation**: MulmoScript → Image generation agents → Scene images
4. **Video Assembly**: Audio + Images → FFmpeg processing → Final video
5. **Multi-format Output**: Same MulmoScript → PDF, captions, translations

### Configuration

The system uses environment variables for API keys and configuration. Required `.env` setup:
- `OPENAI_API_KEY` (required)
- Optional: `GOOGLE_PROJECT_ID`, `REPLICATE_API_TOKEN`, `NIJIVOICE_API_KEY`, `ELEVENLABS_API_KEY`, `BROWSERLESS_API_TOKEN`

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