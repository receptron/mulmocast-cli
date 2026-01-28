# mulmocast-cli

## Initialization

Install dependencies.

```
yarn install
brew install ffmpeg # Or install ffmpeg from https://ffmpeg.org/download.html
```

Create .env file.

```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_PROJECT_ID=your_google_project_id # optional for movie, image generation
BROWSERLESS_API_TOKEN=your_browserless_api_token # optional for scripting from web content
```

## Quick Start
### Generate MulmoScript interactively
```bash
yarn run scripting -i -t seed_interactive
```

This will create a MulmoScript JSON file in the ⁠./output folder by default.

### Generate content using either approach:
- Option 1: Execute each step individually
  ```bash
  yarn run audio scripts/test/test_en.json
  yarn run images scripts/test/test_en.json
  yarn run movie scripts/test/test_en.json
  ```

- Option 2: Generate video in one go (this will process audio and images internally)

  ```bash
  yarn run movie scripts/test/test_en.json
  ```
 

## Create a podcast episode
1. Create a MulmoScript (LLMs are useful for this process)
   1. Feed some source text (ideas, news, press releases) to your favorite LLM.
   2. Ask the LLM to write a podcast script in MulmoScript JSON format (you can use the prompt examples in the [prompts](./prompts) folder as a reference).
   3. Save the generated script as a MulmoScript JSON file (such as [graphai_intro.json](./scripts/samples/graphai_intro.json))
2. Run ```yarn run audio {path to the script file}```.
3. The output will be generated in the `./output` folder.

## Create a video

1. Create a script (MulmoScript) using Claude or another LLM
2. If you need a vertical video for YouTube Live, add those instructions manually
3. Generate audio files using `yarn run audio {path to the script file}`
4. Generate image files using `yarn run images {path to the script file}`
5. Generate the final video file using `yarn run movie {path to the script file}`

# MulmoScript format

```JSON
{
  "title": "title of the podcast",
  "description": "The description of the podcast.",
  "reference": "URL to the source data", // optional
  "speechParams": {
    "provider": "openAI", // or "gemini", "elevenlabs", etc. Default is "openAI"
    "speakers": {
      "Host": {
        "voiceId": "shimmer",
        "displayName": {
          "en": "Host"
        }
      },
      "Guest": {
        "voiceId": "echo",
        "displayName": {
          "en": "Guest"
        }
      }
    }
  },
  "beats": [
    {
      "speaker": "Host",
      "text": "words from the host."
    },
    {
      "speaker": "Guest",
      "text": "words from the guest."
    },
    ...
  ]
}
```

## Translate the script into Japanese

Run ```yarn run translate {path to the script file}```

## Create a movie file with the Japanese script

Run ```yarn run movie {path to the script file}```

## Development Notes
Parts of the Mulmocast codebase utilize GraphAI technology. For more details about GraphAI, please visit the [GraphAI repository](https://github.com/receptron/graphai).

For example, in [src/actions/images.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/actions/images.ts), we implement GraphAI's `GraphData` to define the data flow for image generation:

```typescript
const graph_data: GraphData = {
  // GraphAI data flow definition
}
```

The ⁠GraphAILogger used in this project is also a utility provided by the GraphAI framework, as mentioned in the Logging Guidelines section below.

## Logging Guidelines for Developers

Do **not** use `console.xxx` functions directly.  
Instead, use `GraphAILogger` to manage user-facing logs and control output based on verbosity flags.

### Log Levels

- Use `GraphAILogger.info` for messages intended to be shown to users.
- Use `GraphAILogger.log` and `GraphAILogger.error` for developer-level messages — these will only appear when the `-v` (`--verbose`) flag is enabled.

### Why Use `GraphAILogger`

- Allows user-facing logs to be toggled on/off cleanly.
- Prevents internal logs from interfering with command output or script arguments.
- Keeps behavior consistent across different CLI tools and environments.

Please ensure you choose the appropriate `GraphAILogger` method based on the log's purpose and expected visibility.


## Pull Requests

All pull requests **must pass** lint checks, build, and CI tests before they can be merged.

## Release

In addition to passing the GitHub CI tests, you **must run** `test/release_test.sh` and ensure that **all contents are successfully generated**.
