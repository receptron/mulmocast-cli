---
name: stroke-order
description: Create a stroke order animation MulmoScript using KanjiVG SVG data. Use when the user wants to create stroke order learning content for hiragana, katakana, kanji, or Latin alphabet characters.
argument-hint: "<characters> (e.g., あいうえお, abcdefg, 漢字)"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch
user-invocable: true
---

# /stroke-order — Stroke Order Animation Script

Create a stroke order animation video using MulmoCast with KanjiVG SVG data. Each character is displayed in a square canvas with animated stroke-by-stroke drawing.

**Data source**: [KanjiVG](https://github.com/KanjiVG/kanjivg) (CC BY-SA 3.0)

---

## Phase 1: Parse Input

### Input
- Characters: `$ARGUMENTS` (e.g., "あいうえお", "abcdefg", "漢字")
- If no characters are given, ask the user

### Supported character types
| Type | Range | Example | Language |
|------|-------|---------|----------|
| Hiragana | ぁ-ん | あいうえお | ja |
| Katakana | ァ-ン | アイウエオ | ja |
| Kanji | CJK Unified | 漢字書道 | ja |
| Latin lowercase | a-z | abcdefg | en |

---

## Phase 2: Generate Script (Automated)

### Output directory

```bash
SCRIPTS_DIR="${MULMO_SCRIPTS_DIR:-my-scripts}"
```

### Run the generator script

```bash
npx tsx .claude/skills/stroke-order/generate_stroke_order.ts "$ARGUMENTS" "${SCRIPTS_DIR}/test_stroke_order_{slug}.json"
```

For kanji characters, add readings with `--readings`:

```bash
npx tsx .claude/skills/stroke-order/generate_stroke_order.ts "漢字" "${SCRIPTS_DIR}/test_stroke_order_kanji.json" --readings "カン/-,ジ/あざ"
```

The generator automatically:
1. Fetches KanjiVG SVG data for each character from GitHub
2. Extracts stroke paths in correct order
3. Calculates animation timing based on stroke count
4. Generates the complete MulmoScript JSON

### `--readings` option (for kanji)

Format: `"onyomi/kunyomi,onyomi/kunyomi,..."` — one entry per character, comma-separated.
- Use `-` for missing readings (e.g., `カン/-` = onyomi only)
- Multiple readings separated by `・` (e.g., `カン・ガン/みず`)

Effects:
- **Label**: Shows `音 カン` and `訓 あざ` below the character
- **Speech**: TTS reads "音読み、カン。訓読み、あざ。" instead of the raw kanji

Without `--readings`, kanji characters are spoken as-is (may result in unexpected TTS pronunciation).

### Output file naming
- Hiragana: `test_stroke_order_hiragana_{romaji}.json`
- Katakana: `test_stroke_order_katakana_{romaji}.json`
- Latin: `test_stroke_order_alphabet_{first}_{last}.json`
- Kanji (with readings): `test_stroke_order_{onyomi_romaji}.json` (e.g., `kan_ji`)
- Kanji (without readings): `test_stroke_order_{characters}.json` (e.g., `漢字`)

---

## Phase 3: Generate Movie

After script generation, immediately run `yarn movie` (no need for separate `yarn audio` — all beats have fixed durations, so `yarn movie` handles audio generation internally).

```bash
yarn movie ${SCRIPTS_DIR}/test_stroke_order_{slug}.json
```

Output: `output/test_stroke_order_{slug}_{lang}.mp4`

---

## Technical Details (for reference)

### KanjiVG Data

- Repository: https://github.com/KanjiVG/kanjivg
- Raw URL: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/{5-digit-hex-codepoint}.svg`
- Unicode codepoint examples:
  - あ (U+3042) → `03042.svg`
  - a (U+0061) → `00061.svg`
  - 漢 (U+6F22) → `06f22.svg`
- viewBox: `0 0 109 109`
- Path IDs: `kvg:{codepoint}-s1`, `kvg:{codepoint}-s2`, etc.

### Animation Technique

SVG `stroke-dasharray` / `stroke-dashoffset` animation:
- Ghost paths: same `d` attributes with `stroke='#9ca3af'` (gray-400, always visible)
- Animated paths: `stroke='#dc2626'` (red-600), `stroke-dasharray='400' stroke-dashoffset='400'` → animate dashoffset to 0

### Stroke Color

All animated strokes use a single color: **Red** (`#dc2626` / red-600).

### Duration by Stroke Count

Base duration + 1s extra. First stroke starts 0.5s after beat begins.

| Strokes | Duration |
|---------|----------|
| 1 | 5s |
| 2 | 6s |
| 3 | 6s |
| 4 | 7s |
| 5 | 7s |
| 6+ | min(11, ceil(3 + n * 0.6) + 1)s |

### Canvas & Layout

- Canvas: 720x720 (square)
- SVG display: 420x420 centered
- Guide lines: center cross with dashed lines
- Character label below SVG: `text-5xl` for character, `text-2xl` for romanization (hiragana/katakana), `text-xl` for onyomi/kunyomi (kanji)
- Background: `bg-amber-50` (cream)

### Beat Structure

| Beat | Content |
|------|---------|
| `intro` | Title screen with all characters listed |
| `char_{id}` | One beat per character with animated stroke order |

### MulmoScript Template

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "ja",
  "title": "書き順：ひらがな あ〜お",
  "canvasSize": { "width": 720, "height": 720 },
  "speechParams": {
    "speakers": {
      "Presenter": { "voiceId": "shimmer", "displayName": { "ja": "先生" } }
    }
  },
  "beats": [
    { "id": "intro", "...": "..." },
    { "id": "char_a", "...": "..." }
  ]
}
```

---

## Reference

Working examples:
- `my-scripts/test_stroke_order_alphabet.json` (a-g)
- `my-scripts/test_stroke_order_hiragana.json` (あ-こ)
- `my-scripts/test_stroke_order_kanji.json` (漢字, with --readings)
