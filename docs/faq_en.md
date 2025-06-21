# FAQ

## Compatibility

### Q: Commands started failing after version upgrade

**A: This is likely caused by `_studio.json` files from CLI version 0.0.11 or earlier.**

**Error example**:
```json
currentStudio is invalid ZodError: [
  {
    "code": "unrecognized_keys",
    "keys": ["onComplete"],
    "path": ["beats", 0],
    "message": "Unrecognized key(s) in object: 'onComplete'"
  }
]
```

**Cause**: In v0.0.11 and earlier, the internal studio context saved fields that are no longer valid in v0.0.12 (such as `onComplete`).

**Solution**: Delete the corresponding `_studio.json` file and re-run the CLI. A new compatible version will be automatically created.

**What is a `_studio.json` file?**: This is an internal file (e.g., `my_script_studio.json`) automatically created when you run CLI generation. It stores generation metadata like audio durations, image paths, and progress.

## Multi-language Support

### Q: Can I add Japanese audio and subtitles to an existing English video?

**A: Yes, you can efficiently create multi-language versions using the following steps.**

**File Structure**:
- **Input**: `your_script.json` (original MulmoScript file)
- **Working data**: `output/your_script_studio.json` (auto-generated, editable)
- **Output**: 
  - `output/your_script.mp4` (English version)
  - `output/your_script_ja.mp4` (`-l ja` only)
  - `output/your_script__ja.mp4` (`-c ja` only)
  - `output/your_script_ja__ja.mp4` (`-l ja -c ja`)

```bash
# 1. Create English version (including image generation)
mulmo movie your_script.json

# 2. Create Japanese audio/subtitle version (reusing images)
mulmo movie your_script.json -l ja -c ja
```

**Note**: Replace `your_script.json` with your actual file name

### Q: What's the difference between `-l ja` and `-c ja` options in `mulmo movie` command?

**A: After translating to the specified language, `-l` applies to audio and `-c` applies to subtitles.**

- **`mulmo movie your_script.json -l ja`**: Translate to Japanese + generate Japanese audio
- **`mulmo movie your_script.json -c ja`**: Translate to Japanese + generate Japanese subtitles
- **`mulmo movie your_script.json -l ja -c ja`**: Translate to Japanese + generate both audio & subtitles

```bash
# To run translation only
mulmo translate your_script.json
```

### Q: How can I manually edit translation results?

**A: Edit `multiLingualTexts.ja.text` in `output/your_script_studio.json` file.**

The following example shows Japanese (ja) translation.

```json
{
  "multiLingual": [
    {
      "multiLingualTexts": {
        "ja": {
          "text": "Corrected Japanese text",  // ← Edit this part
          "texts": ["Corrected", "Japanese text"],
          "ttsTexts": ["Corrected", "Japanese text"]
        }
      }
    }
  ]
}
```

**Re-run after manual editing**:
```bash
mulmo movie your_script.json -l ja -c ja
```

**Important**: If you don't modify the original `your_script.json`, manually edited translation data will be preserved and LLM translation is skipped.

### Q: Which text is used for audio and subtitles?

**A: Both use `multiLingualTexts.ja.text`.**

- **Audio generation**: `multiLingualTexts.ja.text`
- **Subtitle generation**: `multiLingualTexts.ja.text`

## Presentation Styles

### Q: How do I use presentation styles with the `-p` option?

**A: The `-p` option accepts file paths to style JSON files. You can download examples or create your own.**

**Getting style files**:
- Download example styles from [GitHub](https://github.com/receptron/mulmocast-cli/tree/main/assets/styles)
- Create your own custom style JSON files

**Usage examples**:
```bash
# Downloaded style
mulmo movie script.json -p ./downloaded-styles/ghibli_style.json

# Project-specific style
mulmo movie script.json -p ./my-project/custom-style.json

# User-wide style
mulmo movie script.json -p ~/.mulmocast/styles/my-style.json
```

**Note**: When installing via `npm install -g mulmocast`, style files are not included. You need to download them separately or create your own.

## Text-to-Speech (TTS) Configuration

### Q: How do I change the TTS engine?

**A: TTS providers can be specified in two ways.**

#### Method 1: Specify TTS provider globally
```json
{
  "speechParams": {
    "provider": "elevenlabs",
    "speakers": {
      "narrator": {
        "voiceId": "your-voice-id"
      }
    }
  }
}
```

**Reference**: See [test_voices.json](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_voices.json#L7) for concrete configuration examples.

#### Method 2: Specify TTS provider per speaker
```json
{
  "speechParams": {
    "provider": "openai",
    "speakers": {
      "narrator": {
        "provider": "elevenlabs",
        "voiceId": "voice-id-1"
      },
      "assistant": {
        "provider": "nijivoice", 
        "voiceId": "voice-id-2"
      }
    }
  }
}
```
Speaker-specific settings take priority; if not specified, the global setting is used.

**Environment variables setup**:
When using each provider, set the corresponding API key in your `.env` file. Available providers and details can be found in [Configuration](../README.md#configuration).

## Troubleshooting

### Q: Getting 429 error during image generation
```
An unexpected error occurred: RateLimitError: 429 {"message":null,"type":"image_generation_user_error","param":null,"code":null}
```

**A: This is caused by OpenAI API rate limits. For optimal experience, we recommend upgrading to Tier 2 or higher.**

Since ChatGPT Plus and OpenAI API are separate services, please consider upgrading to a developer plan for API usage. See [OpenAI Usage Tiers](https://platform.openai.com/docs/guides/rate-limits) for details.