# mulmocast-types

TypeScript type definitions for [MulmoCast](https://github.com/receptron/mulmocast-cli).

This package provides only the type definitions extracted from the main `mulmocast` package, useful for projects that need MulmoCast types without the full runtime dependencies.

## Installation

```bash
npm install mulmocast-types
```

## Usage

```typescript
import { MulmoScript, MulmoBeat, MulmoStudio } from "mulmocast-types";

const script: MulmoScript = {
  version: "1.1",
  title: "My Presentation",
  beats: [
    {
      text: "Hello, world!",
    },
  ],
};
```

## Exported Types

### Core Types
- `MulmoScript` - Main script structure
- `MulmoBeat` - Individual beat/slide definition
- `MulmoStudio` - Studio context with processed data
- `MulmoStoryboard` - Storyboard structure

### Provider Types
- `Text2SpeechProvider` - TTS provider options (openai, google, elevenlabs, etc.)
- `Text2ImageProvider` - Image generation provider options
- `Text2MovieProvider` - Video generation provider options

### Schema Validators (Zod)
- `mulmoScriptSchema` - Zod schema for MulmoScript validation
- `mulmoBeatSchema` - Zod schema for MulmoBeat validation

## Peer Dependencies

Some types reference external packages. Install them if you need full type support:

```bash
npm install graphai  # For agent-related types
npm install yargs    # For CLI-related types
```

