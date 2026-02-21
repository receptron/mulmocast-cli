# Slide DSL Reference

## MulmoScript Beat Structure

### Recommended: Set theme once with slideParams

Use `slideParams.theme` to specify the default theme, then only write `image.slide` in each beat.

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Presentation Title",
  "slideParams": {
    "theme": {
      "colors": { "bg": "0F172A", "bgCard": "1E293B", "bgCardAlt": "334155", "text": "F8FAFC", "textMuted": "CBD5E1", "textDim": "64748B", "primary": "3B82F6", "accent": "8B5CF6", "success": "22C55E", "warning": "F59E0B", "danger": "EF4444", "info": "14B8A6", "highlight": "EC4899" },
      "fonts": { "title": "Georgia", "body": "Calibri", "mono": "Consolas" }
    }
  },
  "beats": [
    {
      "text": "Title slide narration",
      "image": {
        "type": "slide",
        "slide": { "layout": "title", "title": "Main Title", "subtitle": "Subtitle" }
      }
    }
  ]
}
```

### Theme Resolution Priority

1. If `beat.image.theme` exists, use it (beat-level override)
2. Otherwise fall back to `slideParams.theme`
3. If neither exists, throw an error

## Theme

### Colors (13 keys)

| Key | Purpose |
|-----|---------|
| `bg` | Background color |
| `bgCard` | Card background |
| `bgCardAlt` | Alternative card background |
| `text` | Primary text color |
| `textMuted` | Secondary text color |
| `textDim` | Dimmed text color |
| `primary` | Main accent color |
| `accent` | Secondary accent color |
| `success` | Positive / success |
| `warning` | Warning / caution |
| `danger` | Error / danger |
| `info` | Informational |
| `highlight` | Highlight |

Values are 6-digit hex without `#`. Example: `"3B82F6"`

### Fonts (3 keys)

| Key | Purpose |
|-----|---------|
| `title` | Titles and headings |
| `body` | Body text |
| `mono` | Code blocks |

### Preset Themes (6 variants)

Theme JSON files are stored in `assets/slide_themes/`. Read the appropriate file and set its content as `slideParams.theme`.

| File | Name | Style | Best for |
|------|------|-------|----------|
| `assets/slide_themes/dark.json` | dark | Dark Professional | Tech talks, developer presentations |
| `assets/slide_themes/pop.json` | pop | Bright and Energetic | Marketing, product launches |
| `assets/slide_themes/warm.json` | warm | Warm and Welcoming | Education, workshops |
| `assets/slide_themes/creative.json` | creative | Bold and Modern | Design reviews, startup pitches |
| `assets/slide_themes/minimal.json` | minimal | Clean and Fresh | Academic, research |
| `assets/slide_themes/corporate.json` | corporate | Professional | Business reports, formal meetings |

Read the theme JSON file and embed it in `slideParams.theme`:

```json
{
  "slideParams": {
    "theme": { /* contents of assets/slide_themes/dark.json */ }
  }
}
```

#### Using a presentation style (recommended)

Pre-built presentation style files are available in `assets/styles/slide_*.json`. These include `$mulmocast`, `slideParams.theme`, and `canvasSize` (1280x720).

| Style file | Theme |
|-----------|-------|
| `assets/styles/slide_dark.json` | dark |
| `assets/styles/slide_pop.json` | pop |
| `assets/styles/slide_warm.json` | warm |
| `assets/styles/slide_creative.json` | creative |
| `assets/styles/slide_minimal.json` | minimal |
| `assets/styles/slide_corporate.json` | corporate |

Apply via `-s` option:
```bash
yarn cli tool complete beats.json -s slide_dark -o presentation.json
```

## Layouts (11 types)

### title - Title Slide
```json
{ "layout": "title", "title": "...", "subtitle?": "...", "author?": "...", "note?": "..." }
```

### columns - Column Layout
```json
{
  "layout": "columns", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "columns": [{ "title": "...", "accentColor?": "primary", "content?": [...], "footer?": "...", "label?": "...", "num?": 1, "icon?": "..." }],
  "showArrows?": true, "callout?": {...}, "bottomText?": "..."
}
```

### comparison - Side-by-Side Comparison
```json
{
  "layout": "comparison", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "left": { "title": "...", "accentColor?": "danger", "content?": [...], "footer?": "..." },
  "right": { "title": "...", "accentColor?": "success", "content?": [...], "footer?": "..." },
  "callout?": {...}
}
```

### grid - Grid Layout
```json
{
  "layout": "grid", "title": "...", "subtitle?": "...", "gridColumns?": 3,
  "items": [{ "title": "...", "description?": "...", "accentColor?": "primary", "num?": 1, "icon?": "...", "content?": [...] }],
  "footer?": "..."
}
```

### bigQuote - Quote Slide
```json
{ "layout": "bigQuote", "quote": "...", "author?": "...", "role?": "..." }
```

### stats - Statistics / KPIs
```json
{
  "layout": "stats", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "stats": [{ "value": "99.9%", "label": "Uptime", "color?": "success", "change?": "+0.1%" }],
  "callout?": {...}
}
```

### timeline - Timeline
```json
{
  "layout": "timeline", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "items": [{ "date": "Q1 2026", "title": "...", "description?": "...", "color?": "success", "done?": true }]
}
```

### split - Split Panels
```json
{
  "layout": "split",
  "left?": { "title?": "...", "subtitle?": "...", "label?": "...", "labelBadge?": true, "accentColor?": "primary", "content?": [...], "dark?": true, "ratio?": 60, "valign?": "top|center|bottom" },
  "right?": { "title?": "...", "subtitle?": "...", "content?": [...], "ratio?": 40, "valign?": "top|center|bottom" }
}
```

- `labelBadge`: When `true`, renders the `label` as a large rounded badge instead of a small text label
- `valign`: Vertical alignment of panel content (`"top"`, `"center"` (default), `"bottom"`)

### matrix - Matrix (2x2 etc.)
```json
{
  "layout": "matrix", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "rows?": 2, "cols?": 2,
  "xAxis?": { "low?": "...", "high?": "...", "label?": "..." },
  "yAxis?": { "low?": "...", "high?": "...", "label?": "..." },
  "cells": [{ "label": "...", "items?": ["..."], "content?": [...], "accentColor?": "success" }]
}
```

### table - Table
```json
{
  "layout": "table", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "headers": ["Col1", "Col2"],
  "rows": [["val1", { "text": "val2", "color?": "success", "bold?": true, "badge?": true }]],
  "rowHeaders?": true, "striped?": true, "callout?": {...}
}
```

Cell values can be strings or objects. Object cells support `badge: true` with a `color` to render as a colored pill badge (e.g., `{ "text": "+0.69%", "color": "success", "badge": true }`).

### funnel - Funnel
```json
{
  "layout": "funnel", "title": "...", "subtitle?": "...", "stepLabel?": "...",
  "stages": [{ "label": "...", "value?": "1000", "description?": "...", "color?": "info" }],
  "callout?": {...}
}
```

### Common Fields (all layouts)

- `accentColor?`: `"primary" | "accent" | "success" | "warning" | "danger" | "info" | "highlight"`
- `style?`: `{ "bgColor?": "hex", "decorations?": boolean, "bgOpacity?": number, "footer?": "..." }`

## Inline Markup

All text fields across all layouts and content blocks support inline markup:

- `**bold text**` → renders as bold (`<strong>`)
- `{color:colored text}` → renders with accent color (e.g., `{danger:red text}`, `{success:+5.2%}`)

Valid color keys: `primary`, `accent`, `success`, `warning`, `danger`, `info`, `highlight`

These can be combined: `**{success:+5.2%}**` renders bold green text.

HTML is always escaped first, so inline markup is XSS-safe.

## Content Blocks (12 types)

Used in the `content` array of layouts such as columns, comparison, grid, split, and matrix.

### text
```json
{ "type": "text", "value": "...", "align?": "left|center|right", "bold?": true, "dim?": true, "fontSize?": 24, "color?": "primary" }
```

### bullets
Supports flat items (strings) and nested items (2 levels max):
```json
{ "type": "bullets", "items": ["Item 1", "Item 2"], "ordered?": true, "icon?": ">" }
```

Nested bullets example:
```json
{
  "type": "bullets",
  "items": [
    { "text": "Parent item", "items": ["Sub-item A", "Sub-item B"] },
    "Simple flat item",
    { "text": "Another parent", "items": [{ "text": "Object sub-item" }] }
  ]
}
```
Sub-items render with `◦` (hollow bullet) marker and are indented.

### code
```json
{ "type": "code", "code": "const x = 1;", "language?": "typescript" }
```

### callout
```json
{ "type": "callout", "text": "...", "label?": "Note", "color?": "warning", "style?": "quote|info|warning" }
```

### metric
```json
{ "type": "metric", "value": "99.9%", "label": "Uptime", "color?": "success", "change?": "+0.1%" }
```

### divider
```json
{ "type": "divider", "color?": "primary" }
```

### image
```json
{ "type": "image", "src": "photo.png", "alt?": "Description", "fit?": "contain|cover" }
```

### imageRef
```json
{ "type": "imageRef", "ref": "logo", "alt?": "Description", "fit?": "contain|cover" }
```

References an image defined in `imageParams.images`. The `ref` value is a key in `imageParams.images`. At render time, the `imageRef` block is resolved to an `image` block with the generated/loaded image as `src`.

```json
{
  "imageParams": {
    "images": {
      "logo": { "type": "imagePrompt", "prompt": "A modern company logo..." },
      "photo": { "type": "image", "source": { "kind": "path", "path": "team.png" } }
    }
  },
  "beats": [
    {
      "text": "...",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "columns", "title": "Our Team",
          "columns": [
            { "title": "Brand", "content": [{ "type": "imageRef", "ref": "logo" }] },
            { "title": "Team",  "content": [{ "type": "imageRef", "ref": "photo", "fit": "cover" }] }
          ]
        }
      }
    }
  ]
}
```

- `ref` resolves to the image generated/loaded by `imageParams.images.<key>`
- Works with all source types: `imagePrompt` (AI-generated), `image` with `path`/`url`/`base64`
- Unknown ref keys throw an error

### chart
```json
{ "type": "chart", "chartData": { "type": "bar", "data": { "labels": ["Q1", "Q2"], "datasets": [{ "data": [10, 20] }] } }, "title?": "Revenue" }
```

Renders a Chart.js chart inline. `chartData` is passed directly to `new Chart(ctx, chartData)`. Any Chart.js chart type (bar, line, pie, doughnut, radar, polarArea, etc.) is supported. Animation is automatically disabled for Puppeteer rendering.

### mermaid
```json
{ "type": "mermaid", "code": "graph TD\n  A-->B\n  B-->C", "title?": "Flow Diagram" }
```

Renders a Mermaid diagram inline. `code` is the Mermaid diagram definition string. The mermaid theme (dark/default) is automatically chosen based on the slide background color.

### table
Inline table block. Unlike the `table` layout (full-slide), this is a content block combinable with other blocks.
```json
{ "type": "table", "title?": "Market Data", "headers?": ["Index", "Change"], "rows": [["DJIA", { "text": "+0.5%", "color": "success", "badge": true }]], "rowHeaders?": true, "striped?": true }
```

Notes:
- `headers` is optional; omit for key-value style tables
- `rows` uses the same cell format as the `table` layout (string or `{ text, color?, bold?, badge? }`)
- `title` renders a bold heading above the table
- `striped` defaults to true (alternating row backgrounds)
- Can be nested inside `section` blocks for structured layouts

### section
Labeled section with a color badge and content. Ideal for news summaries and structured information.
```json
{ "type": "section", "label": "Overview", "color?": "primary", "text?": "Short description", "content?": [...], "sidebar?": true }
```

Example with nested content:
```json
{
  "type": "section",
  "label": "Market Data",
  "color": "success",
  "content": [
    { "type": "text", "value": "S&P 500 hit **record high**" },
    { "type": "bullets", "items": ["{success:+1.2%} this week", "{danger:-0.3%} futures"] }
  ]
}
```

Notes:
- `text` is a shorthand for a simple text paragraph; use `content` for richer layouts
- `content` accepts all block types except `section` (no recursion)
- Default color is `primary`
- `sidebar`: When `true`, renders a vertical colored sidebar with the label characters stacked vertically, and wraps the content in a card background

## Shared Components

### card (used in columns, grid)
```json
{ "title": "...", "accentColor?": "primary", "content?": [...], "footer?": "...", "label?": "...", "num?": 1, "icon?": "..." }
```

### calloutBar (used in columns, comparison, stats, table, funnel)
```json
{ "text": "...", "label?": "...", "color?": "primary", "align?": "left|center", "leftBar?": true }
```

### slideStyle (available on all layouts)
```json
{ "bgColor?": "hex value", "decorations?": true, "bgOpacity?": 0.8, "footer?": "Page footer" }
```
