---
name: story
description: Create high-quality MulmoScript through structured multi-phase creative process
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_close, mcp__playwright__browser_install
user-invocable: true
---

# /story — Structured MulmoScript Creation

Create compelling MulmoScript through a 6-phase creative process. Each phase produces a deliverable for user review before proceeding.

**Key principle**: Separate *what to say* (narration) from *how to show it* (visuals). Never generate both simultaneously.

---

## Phase 1: Research & Understanding

### Playwright MCP setup (one-time)

Before fetching web URLs, check if Playwright MCP is available by attempting to use `mcp__playwright__browser_navigate`. If the tool is not available:

1. Tell the user: "Playwright MCP が未インストールです。インストールします。"
2. Run: `claude mcp add playwright -- npx @playwright/mcp@latest`
3. Tell the user to restart Claude Code for the MCP to take effect, then re-run `/story`

### Determine the input source

Ask the user what they want to create content about. Inputs can be:
- **URL**: Fetch and analyze the page content (see "Web fetching strategy" below)
- **Topic**: Research with WebSearch to gather key facts, recent developments, and expert perspectives
- **File**: Read the provided file(s)
- **Freeform description**: Work directly from the user's description

### Web fetching strategy

For URL inputs, use Playwright MCP as the primary method:

1. **Playwright MCP (preferred)**: Navigate to the URL with `browser_navigate`, then use `browser_snapshot` to extract the full page content as structured text. This handles paywalled sites, JavaScript-rendered content, and cookie dialogs that block WebFetch.
2. **WebFetch (fallback)**: If Playwright MCP is not available, use WebFetch. Note that this may fail on paywalled or JS-heavy sites.
3. **WebSearch (supplement)**: Use WebSearch to gather additional context, related articles, and fact-checking regardless of the primary fetch method.

After fetching, close the browser with `browser_close` to free resources.

### Conduct deep research

- For URLs: Extract main arguments, key data points, quotes, and structure
- For topics: Search 3-5 sources, cross-reference facts, find compelling examples and statistics
- For files: Analyze content, identify themes, extract key information

### Collect visual assets from source

During research, actively collect real images that can enhance the presentation. **Real images are always more credible and impactful than AI-generated ones** for recognizable subjects (products, people, places, devices, logos).

**IMPORTANT**: Download all collected images locally for stability. External URLs may become unavailable. Store downloaded images in `output/images/{scriptBasename}/` directory, matching the CLI's standard output convention.

#### 1. Extract and download images from the source article

When using Playwright to fetch article content:

- Use `browser_snapshot` to identify `<img>` elements and their URLs
- Use `browser_evaluate` to collect all image URLs:
  ```javascript
  () => Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth > 200).map(img => ({src: img.src, alt: img.alt || ''}))
  ```
- Filter for substantial images (skip icons, ads, avatars) — look for images related to the article content
- **Download each selected image** to `output/images/{scriptBasename}/`:
  ```bash
  mkdir -p output/images/{scriptBasename}
  curl -L -o output/images/{scriptBasename}/{descriptive_name}.jpg "https://example.com/photo.jpg"
  ```

#### 2. Capture element screenshots

For diagrams, charts, infographics, or embedded visuals that are not standalone images:

- Use `browser_take_screenshot` with element `ref` to capture specific page elements, saving to `output/images/{scriptBasename}/`:
  ```text
  browser_take_screenshot with filename: "output/images/{scriptBasename}/diagram.png"
  ```

#### 3. Search for and download real images

Use WebSearch to find authoritative photographs and official images:

- Search for `"[subject] official photo"`, `"[subject] press release image"`, or `"[subject] product shot"`
- Navigate to image results with Playwright if needed to get direct image URLs
- **Download found images** to `output/images/{scriptBasename}/`:
  ```bash
  curl -L -o output/images/{scriptBasename}/{descriptive_name}.jpg "https://found-image-url.jpg"
  ```
- Prefer images from: official company sites, press releases, Reuters/AP, government agencies, Wikipedia Commons
- **Copyright awareness**: Prefer images from press kits, Creative Commons, or fair-use contexts (news reporting)

#### 4. Record collected assets

Maintain a list of downloaded local images for use in Phase 4:
```text
Collected images (saved to output/images/{scriptBasename}/):
- product_photo.jpg: Product photograph from press release
- diagram.png: Architecture diagram captured from article
- satellite.jpg: Official photo from company website
```

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
**Visual tone**: [bright / dark / warm / neutral] — [brief rationale, e.g., "energetic pop culture", "serious data journalism"]
**Suggested theme**: [corporate / pop / warm / creative / minimal / dark] — based on content type and audience

**Collected images** (N found):
- [description]: [URL or screenshot path]
- ...
```

#### Theme-to-Content Matching Guide

| Content Type | Recommended Theme | Rationale |
|-------------|------------------|-----------|
| Business news, financial data | corporate | Clean white background, professional trust |
| Pop culture, entertainment, marketing | pop | Bright pink-toned, energetic and fun |
| Education, community, tutorials | warm | Earthy tones, approachable and welcoming |
| Startups, design, creative showcase | creative | Bold dark background, modern and edgy |
| Academic, research, data-heavy | minimal | Light green-tinted, clean and focused |
| Tech talks, developer content | dark | Dark background, sleek and technical |

**IMPORTANT**: Always choose a theme that matches the content tone. Never default to dark themes for non-technical content.

---

## Phase 2: Story Structure

### Determine scale

First, assess the source content length and decide the presentation scale:

| Source length | Beat count | Structure |
|--------------|-----------|-----------|
| Short (1 article, 1 topic) | 5-8 beats | Single arc: HOOK → CONTEXT → SECTIONS → CLOSE |
| Medium (long article, multiple aspects) | 8-15 beats | Multi-section: HOOK → (SECTION_INTRO → SECTION_BEATS) × N → CLOSE |
| Long (report, multi-chapter document) | 15-25 beats | Chapter-based: HOOK → (CHAPTER_TITLE → CHAPTER_BEATS) × N → CLOSE |

**Principle**: Every major section or chapter in the source document deserves its own mini-arc within the presentation. Do not compress a 10-section report into 8 flat beats — instead, give each section 2-3 beats with its own intro and key points.

### Design the narrative arc

#### Short content (single arc)

- **HOOK** (1 beat): Open with something surprising, a question, or a vivid scene
- **CONTEXT** (1-2 beats): Set the stage — why this matters, background
- **SECTION** (3-6 beats): Core content, each beat advancing the story
- **TRANSITION** (between sections): Bridge beats that connect ideas smoothly
- **CLOSE** (1 beat): Memorable ending — call to action, key takeaway, or forward look

#### Long content (multi-section / chapter-based)

Repeat a mini-arc for each major section or chapter:

- **HOOK** (1 beat): Overall opening
- **CHAPTER N INTRO** (1 beat): Introduce the chapter's theme or question
- **CHAPTER N BEATS** (1-3 beats): Key data, examples, and insights from that chapter
- *(repeat for each chapter)*
- **SYNTHESIS** (1 beat): Connect the chapters — what's the bigger picture?
- **CLOSE** (1 beat): Memorable ending

**Tips for long content**:
- Group related chapters if they share a theme (e.g., combine 3 short chapters into 1 section)
- Use `title` layout for chapter intros to create clear visual breaks
- Vary layouts across chapters to maintain visual interest
- Not every chapter needs equal depth — allocate more beats to the most impactful sections

### Present Beat Outline for approval

```
## Beat Outline (N beats)

| # | Tag | Summary |
|---|-----|---------|
| 1 | HOOK | [one line summary] |
| 2 | CONTEXT | [one line summary] |
| 3 | CH1_INTRO | [one line summary] |
| 4 | CH1 | [one line summary] |
| 5 | CH2_INTRO | [one line summary] |
| ... | ... | ... |
| N | CLOSE | [one line summary] |
```

For short content, use simple tags (HOOK, CONTEXT, SECTION, CLOSE).
For long content, use chapter-prefixed tags (CH1_INTRO, CH1, CH2_INTRO, CH2, ...) to show structure.

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

### Image sourcing priority

**Always prefer real images over AI-generated ones** when the subject has recognizable, authoritative visuals. AI images should supplement, not replace, real photographs.

| Priority | Source | When to use | Example |
|----------|--------|-------------|---------|
| 1st | **Article images** | Photos, diagrams, or illustrations from the source article | Product photo from a press release |
| 2nd | **Official images** | Press photos, product shots found via search | SpaceX rocket photo from spacex.com |
| 3rd | **Element screenshots** | Diagrams or charts embedded in the page | Infographic captured via Playwright |
| 4th | **AI-generated** | Abstract concepts, moods, or scenes with no real counterpart | "Visualization of radio wave interference patterns" |

#### Using downloaded images in imageParams.images

All real images should be downloaded locally during Phase 1 and referenced with `kind: "path"`. Paths are resolved **relative to the MulmoScript file's directory**.

For a script at `scripts/samples/my_topic.json` with images at `output/images/my_topic/`:
```json
{
  "imageParams": {
    "provider": "google",
    "images": {
      "product_photo": {
        "type": "image",
        "source": {
          "kind": "path",
          "path": "../../output/images/my_topic/product_photo.jpg"
        }
      },
      "article_diagram": {
        "type": "image",
        "source": {
          "kind": "path",
          "path": "../../output/images/my_topic/diagram.png"
        }
      },
      "abstract_concept": {
        "type": "imagePrompt",
        "prompt": "Detailed prompt for abstract visualization..."
      }
    }
  }
}
```

**Path formula**: Compute the relative path from the script's directory to `output/images/{basename}/`. For scripts in `scripts/samples/`, this is `../../output/images/{basename}/{filename}`. Adjust the depth (`../`) based on the script's actual location.

**Mix real and generated images** — use downloaded real images for recognizable subjects (people, products, places, hardware) and AI-generated images for abstract concepts, moods, or scenes without real counterparts. **Never use `kind: "url"`** — always download first for stability.

### Choose the visual approach

Based on the content type and user preference, decide the primary visual strategy.

**DEFAULT: Use Option C (Mixed) for slide-based content.** Pure text/data slides feel sterile. Always plan images to embed in slides via `imageRef` blocks within `split` layouts. Aim for at least 2-4 images per presentation to provide visual rhythm and break up data-heavy slides.

**Image planning principle**: Before designing individual slides, identify 3-5 key visual concepts that represent the content's themes (e.g., for a food industry article: restaurant interior, ingredients, storefront). For each concept, decide whether to use a real image (collected in Phase 1) or AI-generated. Define these as named images in `imageParams.images` and embed them in `split` layout slides throughout the presentation.

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
    "provider": "google",
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
    "slide": { "layout": "...", ... },
    "reference": "Source: ... (optional — for data-citing beats)"
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
8. **Length check**: 5-12 beats for short/medium content; 15-25 for long/chapter-based content (see Phase 2 scale table).
9. **Closing impact**: Does the last beat leave the listener with something memorable?
10. **Schema compliance**: All JSON follows MulmoScript schema (version "1.1", proper beat structure).

### Beat-level references

For beats that cite specific data sources, reports, or articles, add a `reference` field to the slide image object. This displays a citation at the bottom-left of the slide.

```json
{
  "text": "Narration for this beat",
  "image": {
    "type": "slide",
    "slide": { "layout": "stats", "title": "Key Numbers", "stats": [...] },
    "reference": "Source: IPCC AR6 Report (2023) — https://www.ipcc.ch/report/ar6/"
  }
}
```

**When to use `reference`**:
- Beats showing statistics, data, or research findings
- Beats quoting or paraphrasing specific articles
- NOT needed for opinion, narrative, or general context beats

### Write the output file

Write the complete MulmoScript JSON file. Use the filename provided by the user, or suggest one based on the content (e.g., `ai_education_2024.json`).

**Do not** present the file to the user yet — proceed to Phase 6 first.

---

## Phase 6: Visual Enhancement Review

After assembling the MulmoScript, perform a self-review pass before presenting to the user. This phase catches common issues that emerge only when seeing the full presentation together.

### Review checklist

#### 1. Theme appropriateness
- Does the chosen theme match the content tone? (e.g., corporate for business news, NOT dark for pop culture)
- If the theme feels wrong, switch it and explain the change

#### 2. Image sourcing and opportunities
- Count how many beats have images (real or AI-generated via `imageRef` or `imagePrompt`)
- **Target: at least 2-4 images per presentation** for visual rhythm
- **Check real image usage**: Were any real images collected in Phase 1? If so, verify they are used instead of AI-generated alternatives for recognizable subjects
- **Replace unnecessary AI images**: If an AI-generated image depicts a real product, place, or person that has authoritative real photos available, replace with the real image
- Identify beats that are pure text/data slides and could benefit from an image in a `split` layout
- For each candidate, define a named image in `imageParams.images` (prefer real images) and embed via `imageRef`

#### 3. Reference citations
- Check beats that present statistics, data, or research findings
- Add `reference` field to cite sources on those slides
- Ensure URLs in `references` array match the sources used

#### 4. Visual balance
- Ensure at least 3 different layout types are used across the presentation
- No more than 3 consecutive beats with the same layout type
- Opening beat uses `title` layout, closing beat uses `bigQuote` or `title`

#### 5. Content density
- No slide should have more than 5-6 content items (bullets, metrics, etc.)
- Split overloaded slides into two beats if needed

### Apply fixes silently

Make any improvements found during this review. Do not ask for approval on individual fixes — apply them and note the changes when presenting the final output.

### Present the output

Output the file path and summarize what was produced:

```text
Wrote: <filename>

Summary:
- N beats, [theme] theme
- M AI-generated images embedded
- Key topics: [brief list]

Next steps:
- Preview slides: yarn cli images <filename>
- Generate audio: yarn audio <filename>
- Generate video: yarn movie <filename>
```
