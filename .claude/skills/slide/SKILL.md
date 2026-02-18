---
name: slide
description: Generate and edit MulmoScript for presentations using the MulmoCast Slide DSL. Write slide JSON in the image field of the beats array.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# MulmoCast Slide DSL

## Overview

The MulmoCast Slide DSL describes presentation slides in JSON. Pipeline: JSON -> Tailwind HTML -> Puppeteer PNG.

- Schema definitions: `src/slide/schema.ts`
- HTML generation: `src/slide/render.ts`
- Layout implementations: `src/slide/layouts/`
- Content blocks: `src/slide/blocks.ts`
- Plugin integration: `src/utils/image_plugins/slide.ts`

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
    },
    {
      "text": "Three-column comparison",
      "image": {
        "type": "slide",
        "slide": {
          "layout": "columns",
          "title": "Comparison",
          "columns": [
            { "title": "Plan A", "accentColor": "primary", "content": [{ "type": "bullets", "items": ["Feature 1", "Feature 2"] }] },
            { "title": "Plan B", "accentColor": "accent", "content": [{ "type": "bullets", "items": ["Feature 3", "Feature 4"] }] }
          ]
        }
      }
    }
  ]
}
```

### Theme Resolution Priority

1. If `beat.image.theme` exists, use it (beat-level override)
2. Otherwise fall back to `slideParams.theme`
3. If neither exists, throw an error

To use a different theme for a specific beat, set `beat.image.theme`.

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
| `assets/slide_themes/dark.json` | dark | Dark Professional | Tech talks, developer presentations, evening events |
| `assets/slide_themes/pop.json` | pop | Bright and Energetic | Marketing, product launches, creative pitches |
| `assets/slide_themes/warm.json` | warm | Warm and Welcoming | Education, workshops, community events |
| `assets/slide_themes/creative.json` | creative | Bold and Modern | Design reviews, startup pitches, creative showcases |
| `assets/slide_themes/minimal.json` | minimal | Clean and Fresh | Academic, research, data-focused presentations |
| `assets/slide_themes/corporate.json` | corporate | Professional and Trustworthy | Business reports, client presentations, formal meetings |

#### Using a theme

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
  "left?": { "title?": "...", "subtitle?": "...", "label?": "...", "accentColor?": "primary", "content?": [...], "dark?": true, "ratio?": 60 },
  "right?": { "title?": "...", "subtitle?": "...", "content?": [...], "ratio?": 40 }
}
```

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
  "rows": [["val1", { "text": "val2", "color?": "success", "bold?": true }]],
  "rowHeaders?": true, "striped?": true, "callout?": {...}
}
```

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

## Content Blocks (8 types)

Used in the `content` array of layouts such as columns, comparison, grid, split, and matrix.

### text
```json
{ "type": "text", "value": "...", "align?": "left|center|right", "bold?": true, "dim?": true, "fontSize?": 24, "color?": "primary" }
```

### bullets
```json
{ "type": "bullets", "items": ["Item 1", "Item 2"], "ordered?": true, "icon?": ">" }
```

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

## Design Principles

1. **Theme consistency**: Use one theme per presentation. Set it once with `slideParams.theme`
2. **Color usage**: Apply semantic colors via `accentColor` on cards, stats, timeline items, etc. Use all 7 accent colors purposefully
3. **Typography**: `font-title` for headings, `font-body` for body text, `font-mono` for code are applied automatically
4. **Layout selection guide**:
   - Opening / closing -> `title`
   - Steps / process -> `columns` (showArrows: true)
   - Compare / contrast -> `comparison`
   - Categories / overview -> `grid`
   - Quotes / key messages -> `bigQuote`
   - Numbers / KPIs -> `stats`
   - Chronological -> `timeline`
   - Two-pane detail -> `split`
   - 2x2 analysis -> `matrix`
   - Data tables -> `table`
   - Conversion / pipeline -> `funnel`
5. **Content density**: Avoid cramming too much into one slide. 3-5 bullet points per slide is ideal

## Workflow

```bash
# 1. Create a beats-only JSON (Claude generates this)
# 2. Convert to complete MulmoScript (with presentation style)
yarn cli tool complete beats.json -s slide_dark -o presentation.json

# 3. Generate slide images
yarn cli image presentation.json -o output/

# 4. Preview a specific beat
yarn cli image presentation.json -o output/ --beat 0
```
