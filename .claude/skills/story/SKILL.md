---
name: story
description: Create high-quality MulmoScript through structured multi-phase creative process
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_close, mcp__playwright__browser_install
user-invocable: true
---

# /story — Structured MulmoScript Creation

Create compelling MulmoScript through a structured creative process. Present Topic Brief + Beat Outline + Narrations + Visual plan to the user, then assemble the final JSON.

**Key principle**: Separate *what to say* (narration) from *how to show it* (visuals). Never generate both simultaneously.

---

## Phase 1: Research & Understanding

### Determine the input source

Ask the user what they want to create content about. Inputs can be:
- **URL**: Fetch and analyze the page content
- **Topic**: Research with WebSearch
- **File**: Read the provided file(s)
- **Freeform description**: Work directly from the user's description

### Web fetching strategy

Try **WebFetch first**. Only use Playwright MCP when WebFetch fails (403, paywalled, JS-heavy).

1. **WebFetch (default)**: Simple and sufficient for most public pages.
2. **Playwright MCP (fallback)**: `browser_navigate` + `browser_snapshot`. Close with `browser_close` after all browser operations (fetching + image collection).
3. **WebSearch (supplement)**: Gather additional context regardless of the primary fetch method.

If the page has pagination, **fetch ALL pages** before proceeding.

### Conduct deep research

- For URLs: Extract main arguments, key data points, quotes, and structure
- For topics: Search 3-5 sources, cross-reference facts
- For files: Analyze content, identify themes

### Collect visual assets

During research, actively download real images. **Real images > AI-generated** for recognizable subjects.

Store in `output/images/{scriptBasename}/`:
```bash
mkdir -p output/images/{scriptBasename}
curl -fL -o output/images/{scriptBasename}/{name}.jpg "URL"
```

If using Playwright, collect image URLs with `browser_evaluate`:
```javascript
() => Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth > 200).map(img => ({src: img.src, alt: img.alt || ''}))
```

### Present Topic Brief for approval

```text
## Topic Brief

**Subject**: [one line]
**Target audience**: [who]
**Tone**: [professional / conversational / energetic / serious]
**Orientation**: [landscape (1280×720) / portrait (1080×1920)]
**Key insights** (3-5):
1. ...

**Suggested theme**: [corporate / pop / warm / creative / minimal / dark]
**Collected images** (N found):
- [description]: [local path]
```

Ask the user about orientation. Default to **landscape** (1280×720) for presentations and standard videos. Use **portrait** (1080×1920) for short-form content (TikTok, Reels, Shorts, Stories).

### Theme-to-Content Matching

**Default to light/bright themes.** Dark theme is only for explicitly technical/developer content.

| Content Type | Theme | Background |
|-------------|-------|-----------|
| Business news, financial data | corporate (DEFAULT) | Light |
| Pop culture, entertainment | pop | Light |
| Education, tutorials | warm | Light |
| Academic, research | minimal | Light |
| Startups, design | creative | Dark |
| Tech talks, developer content | dark | Dark |

---

## Phase 2: Story Structure

### Determine scale

| Source length | Beat count | Structure |
|--------------|-----------|-----------|
| Short (1 article) | 3-8 beats | HOOK → SECTIONS → CLOSE |
| Medium (long article) | 8-15 beats | HOOK → (SECTION_INTRO → BEATS) × N → CLOSE |
| Long (report, multi-chapter) | 15-25 beats | HOOK → (CHAPTER → BEATS) × N → CLOSE |

When user asks for condensed/few slides, aim for 3-5 dense beats.

**YouTube Shorts constraint**: When portrait orientation is selected for Shorts, limit to **3-5 beats** with short narrations (1-2 sentences each) to keep total duration **≤ 60 seconds**. Each beat typically produces ~8-12 seconds of audio.

### Present Beat Outline for approval

```text
## Beat Outline (N beats)

| # | Tag | Summary |
|---|-----|---------|
| 1 | HOOK | ... |
| N | CLOSE | ... |
```

---

## Phase 3: Narration Writing

### Quality standards

**GOOD narration**: Opens with specific detail, uses sensory language, natural spoken rhythm, each beat advances the story.

**BAD narration**: Generic statements ("AI is changing the world"), listy recitation, robotic transitions.

### Guidelines

- **Length**: 2-4 sentences per beat (30-60 words)
- **Language**: Match the `lang` field
- **Flow**: Each beat should feel like a natural continuation

### Present narrations for approval

---

## Phase 4: Visual Design

### Theme selection

Read the theme JSON from `assets/slide_themes/{theme}.json` and embed in `slideParams.theme`.

### Color scheme discipline

**Follow a restrained color palette.** Too many colors creates visual noise.

1. **Pick 1 base color per presentation** (usually `primary`): Use for headings, sidebars, badges, dividers. Creates visual unity.
2. **Add 1-2 highlight colors sparingly**: `danger`/`warning` only for alarming data; `success` only for positive metrics. Target **specific words or values**, not entire sections.
3. **Section sidebars share the base color**: Don't assign different colors to each sidebar — use `primary` for all. Differentiation comes from label text.
4. **Inline `{color:text}` is surgical**: Highlight 1-2 key terms per bullet. Default text color handles the rest.
5. **Metrics encode meaning consistently**: Green=positive, red=negative, primary=neutral. Don't use 4 colors for 4 metrics unless each encodes different meaning.

**BAD** (rainbow sidebars):
```json
{ "type": "section", "label": "A", "color": "primary" },
{ "type": "section", "label": "B", "color": "accent" },
{ "type": "section", "label": "C", "color": "warning" }
```

**GOOD** (unified base + surgical accent):
```json
{ "type": "section", "label": "A", "color": "primary" },
{ "type": "section", "label": "B", "color": "primary" },
{ "type": "section", "label": "C", "color": "primary" }
```
Then inside bullets: `"Key point about {danger:critical risk} and normal context"`

### Slide density by beat count

| Beat count | Density | Approach |
|-----------|---------|----------|
| 3-5 beats | Maximum | Pack each slide like a cheat sheet. Use split + multiple sections, nested bullets, tables, metrics. Every pixel should carry information. |
| 6-10 beats | Standard | 3-5 bullet points per slide. Use split layout with image/chart in one panel and text in the other. Fill space with imageRef or callout blocks. |
| 11+ beats | Relaxed | Focus on one key point per slide. Generous whitespace. Use title/bigQuote for section breaks. |

**Fill space with visuals**: In any density, if a panel has room, add `imageRef`, `imagePrompt`, `chart`, or `mermaid`. Never leave panels empty.

### Layout selection guide

| Content Type | Recommended Layout |
|-------------|-------------------|
| Opening/closing | `title` or `bigQuote` |
| Dense information (DEFAULT) | `split` with content blocks |
| Numbers/KPIs | `stats` or `split` with `metric` blocks |
| Steps/process | `columns` or `timeline` |
| Compare/contrast | `comparison` |
| Data tables | `table` or `split` with `table` block |

### DSL reference and patterns

For layout/block specifications, **Read** `slide_dsl_reference.md` in this skill directory.

For design pattern examples (dense slides, charts, mermaid), **Read** `slide_patterns.md` in this skill directory.

### Image embedding

Define images in `imageParams.images`, then reference with `imageRef` blocks in slide content:
```json
{ "type": "imageRef", "ref": "keyVisual", "alt": "Description", "fit": "contain" }
```

**Path formula**: From `scripts/samples/` to `output/images/` = `../../output/images/{basename}/{filename}`.

For AI-generated images when no real counterpart exists, use `imagePrompt` in `imageParams.images` (object form — defines a named image for `imageRef` to reference):
```json
{ "type": "imagePrompt", "prompt": "Detailed description..." }
```

For image-only beats without slide layout, use `imagePrompt` as a beat-level string field (generates a standalone background image):
```json
{ "text": "Narration", "imagePrompt": "Detailed prompt..." }
```

### Animated beats (`html_tailwind` animation)

For beats that benefit from motion — cinematic intros, opening crawls, data visualizations, 3D effects — use `html_tailwind` animation instead of static slides or imagePrompt.

**Read** `docs/llm/html_animation_reference.md` for the full API reference (MulmoAnimation DSL, interpolate, Easing, property types).

#### When to use animation

| Content Type | Visual Mode |
|-------------|-------------|
| Data, charts, structured info | `slide` (default) |
| Photographic / illustrative imagery | `imagePrompt` |
| Cinematic intros, text crawls, transitions | `html_tailwind` animation |
| Data dashboards with animated counters | `html_tailwind` animation |
| 3D card flips, reveals, code walkthroughs | `html_tailwind` animation |

#### Animated beat structure

```json
{
  "duration": 3,
  "image": {
    "type": "html_tailwind",
    "html": ["<div id='el' style='opacity:0'>...</div>"],
    "script": [
      "const animation = new MulmoAnimation();",
      "animation.animate('#el', { opacity: [0, 1], translateY: [30, 0] }, { start: 0, end: 0.5, easing: 'easeOut' });"
    ],
    "animation": true
  }
}
```

Key rules:
- `html`: HTML markup with Tailwind CSS (no `<script>` tags). Set initial styles inline (e.g., `style='opacity:0'`)
- `script`: JavaScript code (no `<script>` tags). Use `MulmoAnimation` DSL or raw `render()` + `interpolate()`
- `animation`: `true` (30fps) or `{ "fps": 15 }` for custom fps
- `duration`: Required for animated beats (may be auto-calculated from audio)
- Name the MulmoAnimation instance `animation` to enable auto-render (no manual `render()` needed)
- Use `end: 'auto'` for animations that span the entire beat duration

#### Mixing animated beats with slides

Animated beats can be freely mixed with slide beats and imagePrompt beats in the same script. When mixing, ensure `slideParams.theme` is present for any slide beats.

### Present visual plan for approval

---

## Phase 5: Assembly & Review

### Select BGM

Choose background music from the [mulmocast-media BGM catalog](https://github.com/receptron/mulmocast-media/tree/main/bgms) that matches the story mood:

| BGM | Title | Mood | Best for |
|-----|-------|------|----------|
| `story001.mp3` | Whispered Melody | smooth, piano | Calm narratives, reflective stories |
| `story002.mp3` | Rise and Shine | techno, inspiring, piano | Motivational, startup, tech innovation |
| `story003.mp3` | Chasing the Sunset | piano, inspiring | Uplifting stories, journeys, aspirations |
| `story004.mp3` | Whispering Keys | classical, ambient | Academic, research, thoughtful content |
| `story005.mp3` | Whisper of Ivory | piano solo, classical | Elegant, formal, documentary |
| `theme001.mp3` | Rise of the Flame | classical, emotional | Epic achievements, milestones, announcements |
| `vibe001.mp3` | Let It Vibe! | rap, dance | Pop culture, entertainment, energetic |
| `olympic001.mp3` | Olympic-style Theme | epic orchestral fanfare | Grand openings, celebrations, competitions |
| `morning001.mp3` | Morning Dance | morning, piano solo | Lifestyle, daily routines, light topics |

**URL pattern**: `https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/{name}`

Select the BGM that best matches the tone from Phase 1's Topic Brief, and add it to `audioParams`.

### Combine narrations + visuals into MulmoScript JSON

> **Note**: The template below shows commonly used beat fields. If you need a field not listed here, run `npx mulmo tool schema` to verify it exists in the schema before adding it. The beat schema is strict — unrecognized fields will cause validation errors.

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "canvasSize": { "width": 1280, "height": 720 },  // portrait: { "width": 1080, "height": 1920 }
  "title": "Title",
  "description": "Brief description",
  "references": [{ "url": "...", "title": "...", "type": "article" }],
  "speechParams": { "speakers": { "Presenter": { "voiceId": "shimmer" } } },
  "audioParams": {
    "bgm": { "kind": "url", "url": "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3" },
    "bgmVolume": 0.15
  },
  "slideParams": { "theme": { } },
  "imageParams": { "provider": "google", "images": { } },
  "beats": [
    {
      "text": "Narration",
      "speaker": "Presenter",
      "image": {
        "type": "slide",
        "slide": { "layout": "...", "..." : "..." },
        "reference": "Source: ... (optional)"
      }
    }
  ]
}
```

### Add `reference` to data-citing beats

For beats showing statistics or research findings, add `"reference": "Source: ..."` to the `image` object.

### Quality checklist

1. **Hook test**: Does beat 1 grab attention?
2. **Density test**: Does every slide match the target density for its beat count?
3. **Specificity test**: Replace vague statements with concrete numbers, names, examples.
4. **Visual variety**: At least 2-3 different layout types used.
5. **Visual-narration alignment**: Each visual directly supports its narration.
6. **Image check**: Real images used for recognizable subjects; AI-generated only for abstract concepts.
7. **Schema compliance**: Version "1.1", proper beat structure.

### Write the file and present output

Generate the movie directly — `yarn movie` automatically generates images and audio as well, so separate `yarn images` / `yarn audio` steps are unnecessary.

```bash
yarn movie --grouped <filename>
```

```text
Wrote: <filename>

Summary:
- N beats, [theme] theme
- Key topics: [brief list]

Output: output/video/<basename>.mp4
```
