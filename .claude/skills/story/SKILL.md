---
name: story
description: Create high-quality MulmoScript through structured multi-phase creative process
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
user-invocable: true
---

# /story — Structured MulmoScript Creation

Create compelling MulmoScript through a 5-phase creative process. Each phase produces a deliverable for user review before proceeding.

**Key principle**: Separate *what to say* (narration) from *how to show it* (visuals). Never generate both simultaneously.

---

## Phase 1: Research & Understanding

### Determine the input source

Ask the user what they want to create content about. Inputs can be:
- **URL**: Fetch and analyze the page content with WebFetch
- **Topic**: Research with WebSearch to gather key facts, recent developments, and expert perspectives
- **File**: Read the provided file(s)
- **Freeform description**: Work directly from the user's description

### Conduct deep research

- For URLs: Extract main arguments, key data points, quotes, and structure
- For topics: Search 3-5 sources, cross-reference facts, find compelling examples and statistics
- For files: Analyze content, identify themes, extract key information

### Present Topic Brief for approval

Present the following to the user and **wait for approval**:

```
## Topic Brief

**Subject**: [one line]
**Target audience**: [who is this for]
**Purpose**: [inform / persuade / educate / entertain]
**Tone**: [professional / conversational / energetic / serious]
**Key insights** (3-5):
1. ...
2. ...
3. ...

**Suggested angle**: [the unique perspective or hook for this content]
```

---

## Phase 2: Story Structure

### Design the narrative arc

Create a beat outline that follows a clear narrative arc:
- **HOOK** (1 beat): Open with something surprising, a question, or a vivid scene
- **CONTEXT** (1-2 beats): Set the stage — why this matters, background
- **SECTION** (3-6 beats): Core content, each beat advancing the story
- **TRANSITION** (between sections): Bridge beats that connect ideas smoothly
- **CLOSE** (1 beat): Memorable ending — call to action, key takeaway, or forward look

### Present Beat Outline for approval

```
## Beat Outline (N beats)

| # | Tag | Summary |
|---|-----|---------|
| 1 | HOOK | [one line summary] |
| 2 | CONTEXT | [one line summary] |
| 3 | SECTION | [one line summary] |
| ... | ... | ... |
| N | CLOSE | [one line summary] |
```

**Wait for user approval** before proceeding.

---

## Phase 3: Narration Writing

### Write each beat's narration

For each beat in the outline, write the full narration text (`text` field). Follow these quality standards:

**GOOD narration**:
- Opens with a specific, concrete detail (person, place, number, date)
- Uses sensory language — the listener should *see* or *feel* something
- Has natural spoken rhythm — read it aloud mentally
- Each beat advances the story; no filler

**BAD narration**:
- Generic statements: "AI is changing the world. Let's look at some examples."
- Listy recitation: "First, there's X. Second, there's Y. Third, there's Z."
- Robotic transitions: "Now let's move on to the next topic."

**Example contrast**:
- BAD: `"AI is transforming education. Let's explore some examples."`
- GOOD: `"In 2024, a seven-year-old girl in rural Kenya leaped two grade levels in math — taught entirely by an AI tutor, in a classroom with no teacher."`

### Narration guidelines

- **Length**: 2-4 sentences per beat (30-60 words). Enough to convey one clear idea.
- **Speaker**: If multiple speakers, indicate who speaks each beat
- **Flow**: Each beat should feel like a natural continuation of the previous one
- **Language**: Match the `lang` field. Write narration in that language.

### Present narrations for approval

Show all beat narrations in order. **Wait for user approval** before proceeding.

---

## Phase 4: Visual Design

### Choose the visual approach

Based on the content type and user preference, decide the primary visual strategy:

#### Option A: Slide-based (for data, technical, educational content)

Use the Slide DSL. Select layouts based on content type:

| Content Type | Recommended Layout |
|-------------|-------------------|
| Opening/closing | `title` |
| Steps/process | `columns` with `showArrows: true` |
| Compare/contrast | `comparison` |
| Categories/overview | `grid` |
| Quotes/key messages | `bigQuote` |
| Numbers/KPIs | `stats` |
| Chronological | `timeline` |
| Two-pane detail | `split` |
| 2x2 analysis | `matrix` |
| Data tables | `table` |
| Conversion/pipeline | `funnel` |

**Theme selection**: Read a theme from `assets/slide_themes/` and set it in `slideParams.theme`.

| Theme file | Style | Best for |
|-----------|-------|---------|
| `assets/slide_themes/dark.json` | Dark Professional | Tech talks, developer presentations |
| `assets/slide_themes/pop.json` | Bright Energetic | Marketing, product launches |
| `assets/slide_themes/warm.json` | Warm Welcoming | Education, workshops |
| `assets/slide_themes/creative.json` | Bold Modern | Design reviews, startup pitches |
| `assets/slide_themes/minimal.json` | Clean Fresh | Academic, research, data-focused |
| `assets/slide_themes/corporate.json` | Professional | Business reports, formal meetings |

#### Option B: AI-generated images (for storytelling, narrative, creative content)

Use `imagePrompt` on each beat, or define shared images in `imageParams.images` and reference with `imageNames`/`imageRef`.

**Image prompt quality standard** — include all relevant elements:
- **Subject**: What is the main focus? (person, object, scene)
- **Action**: What is happening? (standing, running, exploding)
- **Environment**: Where? (office, forest, space station)
- **Lighting**: What mood? (golden hour, neon, dramatic shadows)
- **Style**: What aesthetic? (photorealistic, watercolor, isometric)
- **Color palette**: Dominant colors (warm earth tones, cool blues)
- **Camera**: Perspective (wide-angle, close-up, bird's eye)

**BAD prompt**: `"A picture of AI in education"`
**GOOD prompt**: `"A seven-year-old Kenyan girl in a bright yellow school uniform, sitting at a wooden desk in a sunlit rural classroom, smiling as she interacts with a glowing tablet showing colorful math problems, warm natural lighting through open windows, photorealistic style"`

**Named images pattern** — when the same visual element appears in multiple beats:
```json
{
  "imageParams": {
    "images": {
      "protagonist": {
        "type": "imagePrompt",
        "prompt": "A detailed description..."
      },
      "setting": {
        "type": "imagePrompt",
        "prompt": "A detailed description..."
      }
    }
  }
}
```
Then reference in beats with `"imageNames": ["protagonist"]` to use specific images per beat.

#### Option C: Mixed (slides with embedded images)

Combine Slide DSL layouts with `imageRef` blocks for maximum visual impact.

Define images in `imageParams.images`, then reference them inside slide content blocks:
```json
{
  "type": "imageRef",
  "ref": "keyVisual",
  "alt": "Description",
  "fit": "cover"
}
```

Best for: presentations that need both data visualization and photographic/illustrative content.

#### Embedding charts and diagrams in slides

Slide content blocks support `chart` and `mermaid` types directly inside layouts (columns, split, grid, etc.):

**Chart block** (Chart.js — bar, line, pie, doughnut, radar, polarArea):
```json
{
  "type": "chart",
  "chartData": {
    "type": "bar",
    "data": {
      "labels": ["Q1", "Q2", "Q3"],
      "datasets": [{ "label": "Revenue", "data": [10, 20, 30] }]
    }
  },
  "title": "Quarterly Revenue"
}
```

**Mermaid block** (flowcharts, sequence diagrams, timelines):
```json
{
  "type": "mermaid",
  "code": "graph TD\n  A[Start] --> B[Process]\n  B --> C[End]",
  "title": "Flow"
}
```

**IMPORTANT: Always embed chart/mermaid inside slide layouts** rather than using them as standalone beat image types. Embedding inside slides (e.g., `split`, `columns`, `grid`) ensures consistent theming, allows adding titles/callouts/context alongside the visualization, and produces a unified visual style across all beats.

**Recommended pattern** — chart inside a `split` layout:
```json
{
  "image": {
    "type": "slide",
    "slide": {
      "layout": "split",
      "left": {
        "title": "Key Insight",
        "content": [
          { "type": "text", "value": "Context for the data" },
          { "type": "metric", "value": "42%", "label": "Growth rate", "color": "success" }
        ]
      },
      "right": {
        "content": [
          { "type": "chart", "chartData": { "type": "bar", "data": { ... } }, "title": "Revenue" }
        ]
      }
    }
  }
}
```

**Recommended pattern** — mermaid inside a `split` layout:
```json
{
  "image": {
    "type": "slide",
    "slide": {
      "layout": "split",
      "left": {
        "content": [
          { "type": "mermaid", "code": "graph TD\n  A-->B\n  B-->C", "title": "Process" }
        ]
      },
      "right": {
        "title": "Explanation",
        "content": [
          { "type": "bullets", "items": ["Step 1", "Step 2", "Step 3"] }
        ]
      }
    }
  }
}
```

**Design tips**:
- Use charts for quantitative data (stock prices, market size, percentages)
- Use mermaid for relationships and processes (org structures, cause-and-effect chains)
- Pair with text/metric/callout blocks in the adjacent panel for context
- Avoid standalone `{ "image": { "type": "chart" } }` or `{ "image": { "type": "mermaid" } }` — always wrap in a slide layout

### Design visuals for each beat

For each beat, specify the visual treatment:
- Slide-based: Layout type and key content elements
- Image-based: Full image prompt
- Chart/Mermaid: Data visualization or diagram (standalone or embedded in slide)
- Mixed: Layout + imageRef/chart/mermaid blocks combined

### Present visual plan for approval

Show the visual design for each beat. **Wait for user approval** before proceeding.

---

## Phase 5: MulmoScript Assembly

### Combine narrations + visuals into MulmoScript JSON

Assemble the final JSON by merging Phase 3 narrations with Phase 4 visuals.

### MulmoScript structure reference

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Presentation Title",
  "description": "Brief description of this content",
  "references": [
    { "url": "https://source.example.com", "title": "Source Title", "type": "article" }
  ],
  "speechParams": {
    "speakers": {
      "Presenter": {
        "voiceId": "shimmer"
      }
    }
  },
  "slideParams": {
    "theme": { }
  },
  "imageParams": {
    "provider": "genai",
    "images": { }
  },
  "beats": [
    {
      "text": "Narration text here",
      "speaker": "Presenter",
      "image": { }
    }
  ]
}
```

### Beat structure

```json
{
  "text": "Narration for this beat",
  "speaker": "Presenter",
  "image": {
    "type": "slide",
    "slide": { "layout": "...", ... }
  }
}
```

Or for image-based beats:

```json
{
  "text": "Narration for this beat",
  "imagePrompt": "Detailed image generation prompt...",
  "imageNames": ["namedImage1"]
}
```

### Image types reference

| Type | Use for | Key fields |
|------|---------|-----------|
| `slide` | Structured slides (Slide DSL) | `image.slide` — see `/slide` skill for full DSL |
| `imagePrompt` | AI-generated images per beat | `beat.imagePrompt` (string) |
| `markdown` | Markdown-rendered cards | `image.markdown`, `image.style` |
| `mermaid` | Diagrams (flowcharts, sequences) | `image.code`, `image.title` |
| `chart` | Data charts (Chart.js) | `image.chartData` |
| `image` | Static images (URL/path/base64) | `image.source` |
| `textSlide` | Simple title+bullets | `image.slide.title`, `image.slide.bullets` |

### Apply presentation style

If using slides, read the appropriate theme file and embed in `slideParams.theme`.
If using a full presentation style file from `assets/styles/`, apply it as the base.

### Content Quality Checklist

Before writing the final file, self-review against these criteria:

1. **Hook test**: Does beat 1 grab attention within the first sentence?
2. **So-what test**: Would a listener wonder "why should I care?" at any point? If yes, add context.
3. **Flow test**: Read all narrations in sequence — do they flow naturally as spoken word?
4. **Redundancy test**: Does any beat repeat information from a previous beat?
5. **Specificity test**: Replace any vague statement with a concrete example, number, or name.
6. **Visual variety**: Are at least 3 different layout types or visual approaches used?
7. **Visual-narration alignment**: Does each visual directly support its narration? No generic stock-photo vibes.
8. **Length check**: Total beats between 5-12 for most content (adjust for user request).
9. **Closing impact**: Does the last beat leave the listener with something memorable?
10. **Schema compliance**: All JSON follows MulmoScript schema (version "1.1", proper beat structure).

### Write the output file

Write the complete MulmoScript JSON file. Use the filename provided by the user, or suggest one based on the content (e.g., `ai_education_2024.json`).

Output the file path and suggest next steps:

```
Wrote: <filename>

Next steps:
- Preview slides: yarn cli image <filename> --beat 0
- Generate all images: yarn images <filename>
- Generate audio: yarn audio <filename>
- Generate video: yarn movie <filename>
- Apply a style: yarn cli tool complete <filename> -s slide_dark -o styled.json
```
