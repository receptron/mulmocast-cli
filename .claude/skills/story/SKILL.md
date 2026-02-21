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
2. **Playwright MCP (fallback)**: `browser_navigate` + `browser_snapshot`. Close with `browser_close` after fetching.
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
curl -L -o output/images/{scriptBasename}/{name}.jpg "URL"
```

If using Playwright, collect image URLs with `browser_evaluate`:
```javascript
() => Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth > 200).map(img => ({src: img.src, alt: img.alt || ''}))
```

For diagrams/infographics, download directly via curl from the extracted URLs.

### Present Topic Brief for approval

```
## Topic Brief

**Subject**: [one line]
**Target audience**: [who]
**Tone**: [professional / conversational / energetic / serious]
**Key insights** (3-5):
1. ...

**Suggested theme**: [corporate / pop / warm / creative / minimal / dark]
**Collected images** (N found):
- [description]: [local path]
```

#### Theme-to-Content Matching

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

### Present Beat Outline for approval

```
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

### Default approach: Mixed slides with embedded images

Use Slide DSL layouts with real/AI images embedded via `imageRef`. This is the default for all content.

Define images in `imageParams.images` (prefer `kind: "path"` for downloaded images), then embed inside slide content blocks:
```json
{ "type": "imageRef", "ref": "keyVisual", "alt": "Description", "fit": "contain" }
```

**Path formula**: From `scripts/samples/` to `output/images/` = `../../output/images/{basename}/{filename}`.

For AI-generated images when no real counterpart exists:
```json
{ "type": "imagePrompt", "prompt": "Detailed description..." }
```

### Color scheme discipline

**Follow a restrained color palette.** Too many colors creates visual noise. Each slide should feel cohesive, not like a rainbow.

#### Rules

1. **Pick 1 base color per presentation** (usually `primary`): Use this for headings, section sidebars, badges, dividers, and accent bars. This creates visual unity across all slides.

2. **Add 1-2 highlight colors sparingly**: Use `danger` or `warning` only for genuinely alarming data points or critical warnings. Use `success` only for positive metrics. These should appear on **specific words or values**, not entire sections.

3. **Section sidebars within a single slide should share the base color**: Don't assign a different color to each section sidebar — use the same `primary` color for all sidebars on a slide. Differentiation comes from the label text, not color.

4. **Inline markup `{color:text}` is for surgical emphasis**: Highlight 1-2 key terms per bullet, not every noun. Default text color (from theme) handles the rest.

5. **Metrics can use color to encode meaning**: Green for positive, red for negative, primary for neutral. But keep it consistent — don't use 4 different colors for 4 metrics unless each encodes different meaning.

#### BAD color usage (too many colors, no hierarchy):
```json
{ "type": "section", "label": "A", "color": "primary", ... },
{ "type": "section", "label": "B", "color": "accent", ... },
{ "type": "section", "label": "C", "color": "warning", ... }
```

#### GOOD color usage (unified base + surgical accent):
```json
{ "type": "section", "label": "A", "color": "primary", ... },
{ "type": "section", "label": "B", "color": "primary", ... },
{ "type": "section", "label": "C", "color": "primary", ... }
```
Then inside bullets: `"Key point about {danger:critical risk} and normal context"`

### Dense slide design principles

**Pack information into each slide.** Every slide should feel like a "cheat sheet" — dense, structured, and scannable. Avoid sparse slides with large empty areas.

#### Key techniques for dense slides

1. **Use `split` layout as the primary workhorse**: Left panel for structured text content, right panel for images/diagrams or complementary metrics.

2. **Use `section` blocks with `sidebar: true` to organize multiple topics**: Each section gets a colored vertical label bar. Use the **same base color** for all sidebars within a slide for visual unity.

3. **Nest content blocks inside sections**: `section` > `bullets` with sub-items provides 3 levels of information hierarchy.

4. **Combine block types in one panel**: Mix `text` (header) + `section` + `section` + `section` or `text` + `bullets` + `divider` + `table` for maximum density.

5. **Use `metric` blocks for KPIs**: Pack 3-4 metrics in a panel for data-heavy slides.

6. **Use `callout` blocks for key quotes or warnings**: Adds visual weight to important statements.

7. **Use `table` blocks for structured data**: Embed tables inside section blocks or split panels for financial data, comparisons, etc.

#### Dense slide pattern: split with multiple sections

This is the go-to pattern for information-dense slides. Note: all section sidebars share `primary` color; accent is used only for inline emphasis on key terms.

```json
{
  "layout": "split",
  "accentColor": "primary",
  "left": {
    "ratio": 55,
    "valign": "top",
    "content": [
      {
        "type": "text",
        "value": "Main headline or thesis",
        "bold": true, "fontSize": 24, "color": "primary"
      },
      {
        "type": "section",
        "label": "Topic A",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Key point about {danger:critical term}", "items": ["Detail 1", "Detail 2"] }
            ]
          }
        ]
      },
      {
        "type": "section",
        "label": "Topic B",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Another key point", "items": ["Sub-detail A", "Sub-detail B"] }
            ]
          }
        ]
      },
      {
        "type": "section",
        "label": "Topic C",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Third topic", "items": ["Data point", "Conclusion"] }
            ]
          }
        ]
      }
    ]
  },
  "right": {
    "dark": true,
    "ratio": 45,
    "valign": "center",
    "content": [
      { "type": "imageRef", "ref": "diagram", "alt": "Description", "fit": "contain" },
      { "type": "callout", "text": "Key takeaway quote", "style": "info" }
    ]
  }
}
```

#### Dense slide pattern: split with metrics + context

Metrics use color to encode meaning (green=positive, red=negative, primary=neutral):

```json
{
  "layout": "split",
  "left": {
    "labelBadge": true, "label": "Badge Title", "accentColor": "primary",
    "title": "Main Title", "subtitle": "Context line",
    "ratio": 55,
    "content": [
      { "type": "text", "value": "Supporting context paragraph.", "dim": true }
    ]
  },
  "right": {
    "dark": true, "ratio": 45, "valign": "center",
    "content": [
      { "type": "metric", "value": "42%", "label": "Growth rate", "color": "success" },
      { "type": "metric", "value": "1.2M", "label": "Users", "color": "primary" },
      { "type": "metric", "value": "-3%", "label": "Churn", "color": "danger" }
    ]
  }
}
```

#### Dense slide pattern: split with table + bullets

```json
{
  "layout": "split",
  "left": {
    "ratio": 45, "dark": true,
    "content": [
      { "type": "imageRef", "ref": "photo", "alt": "...", "fit": "contain" },
      { "type": "callout", "text": "Caption or context", "label": "Note", "style": "info" }
    ]
  },
  "right": {
    "ratio": 55, "labelBadge": true, "label": "Section Title", "accentColor": "primary",
    "content": [
      {
        "type": "bullets", "icon": "▸",
        "items": [
          { "text": "Point 1 with {danger:critical term}", "items": ["Detail"] },
          { "text": "Point 2 with supporting context", "items": ["Detail"] }
        ]
      }
    ]
  }
}
```

### Inline markup reference

Use `{color:text}` for colored inline text within bullets and text blocks:
- `{primary:keyword}`, `{danger:warning}`, `{success:positive}`, `{accent:emphasis}`, `{warning:caution}`, `{info:technical}`
- Use `**bold**` for bold text within inline markup

### Layout selection guide

| Content Type | Recommended Layout |
|-------------|-------------------|
| Opening/closing | `title` or `bigQuote` |
| Dense information (DEFAULT) | `split` with content blocks |
| Numbers/KPIs | `stats` or `split` with `metric` blocks |
| Steps/process | `columns` or `timeline` |
| Compare/contrast | `comparison` |
| Data tables | `table` or `split` with `table` block |

**Theme selection**: Read the theme JSON from `assets/slide_themes/{theme}.json` and embed in `slideParams.theme`.

### Embedding charts and diagrams

Slide content blocks support `chart` and `mermaid` types directly inside layouts. **Always embed inside slide layouts** (e.g., `split`) rather than using standalone — this ensures consistent theming and allows adding context alongside the visualization.

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

**Recommended pattern** — chart inside a `split` layout:
```json
{
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
      { "type": "chart", "chartData": { "type": "bar", "data": { "labels": ["A","B","C"], "datasets": [{"label":"X","data":[10,20,30]}] } }, "title": "Revenue" }
    ]
  }
}
```

**Recommended pattern** — mermaid inside a `split` layout:
```json
{
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
```

**Design tips**:
- Use charts for quantitative data (stock prices, market size, percentages)
- Use mermaid for relationships and processes (org structures, cause-and-effect chains)
- Pair with text/metric/callout blocks in the adjacent panel for context

### Present visual plan for approval

---

## Phase 5: Assembly & Review

### Combine narrations + visuals into MulmoScript JSON

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "canvasSize": { "width": 1280, "height": 720 },
  "title": "Title",
  "description": "Brief description",
  "references": [{ "url": "...", "title": "...", "type": "article" }],
  "speechParams": { "speakers": { "Presenter": { "voiceId": "shimmer" } } },
  "slideParams": { "theme": { } },
  "imageParams": { "provider": "google", "images": { } },
  "beats": [
    {
      "text": "Narration",
      "speaker": "Presenter",
      "image": {
        "type": "slide",
        "slide": { "layout": "...", ... },
        "reference": "Source: ... (optional)"
      }
    }
  ]
}
```

For image-based beats (narrative/creative content):
```json
{ "text": "Narration", "imagePrompt": "Detailed prompt...", "imageNames": ["namedImage"] }
```

### Add `reference` to data-citing beats

For beats showing statistics or research findings, add `"reference": "Source: ..."` to the `image` object.

### Quality checklist

Before writing the final file:

1. **Hook test**: Does beat 1 grab attention?
2. **Density test**: Does every slide feel packed with useful information? No sparse empty slides.
3. **Specificity test**: Replace vague statements with concrete numbers, names, examples.
4. **Visual variety**: At least 2-3 different layout types used.
5. **Visual-narration alignment**: Each visual directly supports its narration.
6. **Image check**: Real images used for recognizable subjects; AI-generated only for abstract concepts.
7. **Schema compliance**: Version "1.1", proper beat structure.

### Write the file and present output

```text
Wrote: <filename>

Summary:
- N beats, [theme] theme
- Key topics: [brief list]

Next steps:
- Preview: yarn cli images <filename>
- Audio: yarn audio <filename>
- Video: yarn movie <filename>
```
