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

**A: Both automatically execute translation processing, but each controls different functions.**

- **`mulmo movie your_script.json -l ja`**: Translation processing + Japanese audio generation
- **`mulmo movie your_script.json -c ja`**: Translation processing + Japanese subtitle generation
- **`mulmo movie your_script.json -l ja -c ja`**: Translation processing + both Japanese audio & subtitles

```bash
# To run translation only
mulmo translate your_script.json
```

### Q: How can I manually edit translation results?

**A: Edit `multiLingualTexts.ja.text` in `output/your_script_studio.json` file.**

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