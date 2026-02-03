# Background Image Feature Plan

## Overview

Add background image support for `markdown` and `textSlide` media types in MulmoCast.

## Goals

- Allow users to set background images at both global (imageParams) and beat levels
- Support simple URL strings and detailed configuration objects
- Maintain compatibility with existing `style` property

## Scope

### Phase 1 (This Implementation)

- `markdown` type
- `textSlide` type

### Future Phases

- `html_tailwind` type
- `mermaid` type
- `chart` type

## Schema Design

### backgroundImageSchema

```typescript
const backgroundImageSourceSchema = z.object({
  source: mediaSourceSchema,  // { kind: "url" | "path" | "base64", ... }
  size: z.enum(["cover", "contain", "auto"]).optional(),  // default: "cover"
  position: z.string().optional(),  // default: "center"
  opacity: z.number().min(0).max(1).optional(),  // default: 1
});

const backgroundImageSchema = z.union([
  z.string(),  // Simple: URL string
  backgroundImageSourceSchema,
]).nullable();
```

### imageParams Addition

```typescript
// In mulmoImageParamsSchema
imageParams: {
  provider: "openai" | "google" | ...,
  model: "...",
  backgroundImage: backgroundImageSchema,  // NEW
}
```

### markdown/textSlide Addition

```typescript
// mulmoMarkdownMediaSchema
{
  type: "markdown",
  markdown: [...],
  style: "...",
  backgroundImage: backgroundImageSchema,  // NEW
}

// mulmoTextSlideMediaSchema
{
  type: "textSlide",
  slide: { ... },
  style: "...",
  backgroundImage: backgroundImageSchema,  // NEW
}
```

## Priority Rules

```
beat.image.backgroundImage > imageParams.backgroundImage > style background
```

- `null` explicitly disables background image (uses style background instead)
- `undefined` inherits from imageParams

## Usage Examples

### Simple URL (Global)

```json
{
  "$mulmocast": { "version": "1.1" },
  "title": "Presentation",
  "imageParams": {
    "provider": "openai",
    "backgroundImage": "https://example.com/bg.jpg"
  },
  "beats": [
    {
      "text": "Slide 1",
      "image": {
        "type": "markdown",
        "markdown": ["# Title"]
      }
    }
  ]
}
```

### Detailed Configuration (Beat Level)

```json
{
  "image": {
    "type": "markdown",
    "markdown": ["# Special Slide"],
    "backgroundImage": {
      "source": { "kind": "path", "path": "./images/special-bg.png" },
      "size": "cover",
      "position": "center top",
      "opacity": 0.7
    }
  }
}
```

### Disable Background for Specific Beat

```json
{
  "image": {
    "type": "markdown",
    "markdown": ["# No Background"],
    "backgroundImage": null
  }
}
```

### Local File Reference

```json
{
  "imageParams": {
    "backgroundImage": {
      "source": { "kind": "path", "path": "./assets/default-bg.png" }
    }
  }
}
```

## Implementation Plan

### Step 1: Schema Updates

**File:** `src/types/schema.ts`

1. Define `backgroundImageSourceSchema`
2. Define `backgroundImageSchema` (union of string and source object, nullable)
3. Add `backgroundImage` to `mulmoMarkdownMediaSchema`
4. Add `backgroundImage` to `mulmoTextSlideMediaSchema`
5. Add `backgroundImage` to `mulmoImageParamsSchema`

### Step 2: Type Definitions

**File:** `src/types/type.ts`

1. Export `BackgroundImage` type from schema inference

### Step 3: Utility Functions

**File:** `src/utils/image_plugins/utils.ts` (or new file)

1. `resolveBackgroundImage(beatBg, globalBg)` - resolve priority
2. `backgroundImageToCSS(bg)` - convert to CSS string
3. `loadBackgroundImageAsDataUrl(source)` - load image and convert to base64 data URL

### Step 4: Markdown Plugin Update

**File:** `src/utils/image_plugins/markdown.ts`

1. Import background image utilities
2. Pass `backgroundImage` from params
3. Inject background CSS into generated HTML

### Step 5: TextSlide Plugin Update

**File:** `src/utils/image_plugins/text_slide.ts`

1. Import background image utilities
2. Pass `backgroundImage` from params
3. Inject background CSS into generated HTML

### Step 6: Context/Params Propagation

**File:** `src/actions/images.ts` (or relevant action file)

1. Pass `imageParams.backgroundImage` to image processors

## CSS Generation

### Background CSS Template

```css
body {
  background-image: url('data:image/png;base64,...');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 1; /* Applied via wrapper or filter */
}
```

### Opacity Handling

Since CSS `opacity` affects all content, use pseudo-element approach:

```css
body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('...');
  background-size: cover;
  background-position: center;
  opacity: 0.7;
  z-index: -1;
}
```

## Testing

### Test Cases

1. Global backgroundImage with URL string
2. Beat-level override with detailed config
3. Beat-level null to disable
4. Local file path loading
5. Opacity setting
6. Size and position options
7. Combination with existing style property

### Test Script Location

`scripts/test/test_background_image.json`

## File Changes Summary

| File | Changes |
|------|---------|
| `src/types/schema.ts` | Add backgroundImage schemas |
| `src/types/type.ts` | Export BackgroundImage type |
| `src/utils/image_plugins/utils.ts` | Add background utilities |
| `src/utils/image_plugins/markdown.ts` | Inject background CSS |
| `src/utils/image_plugins/text_slide.ts` | Inject background CSS |
| `src/actions/images.ts` | Pass backgroundImage to processors |

## Version

This feature will be released in MulmoCast 2.2.0 (or next minor version).
