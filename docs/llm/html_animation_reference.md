# html_tailwind Animation API Reference

This is a concise reference for generating animated html_tailwind beats in MulmoScript.
The runtime template injects helper functions (`interpolate`, `Easing`, `MulmoAnimation`) that are available in the `script` field.

## Beat Structure

```json
{
  "image": {
    "type": "html_tailwind",
    "html": ["<div id='el'>...</div>"],
    "script": ["function render(frame, totalFrames, fps) { ... }"],
    "animation": true
  }
}
```

- `html`: HTML markup only (no `<script>` tags)
- `script`: JavaScript code (no `<script>` tags — automatically wrapped)
- `animation`: `true` (30fps) or `{ "fps": 15 }` for custom fps
- `duration`: **Do NOT set** — automatically calculated from audio length. Only set explicitly for silent beats or when you need a fixed duration.

## Available Runtime APIs

### interpolate(value, opts)

Maps a frame number to a value range with clamping and optional easing.

```javascript
interpolate(frame, {
  input: { inMin: 0, inMax: fps },
  output: { outMin: 0, outMax: 1 },
  easing: 'easeOut'  // optional: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | Easing.xxx
})
```

### Easing

```javascript
Easing.linear     // t => t
Easing.easeIn     // t => t * t
Easing.easeOut    // t => 1 - (1 - t) * (1 - t)
Easing.easeInOut  // smooth acceleration/deceleration
```

### MulmoAnimation

Declarative animation helper. Times (`start`, `end`) are in **seconds**. Use `end: 'auto'` to span the entire beat duration.

```javascript
const animation = new MulmoAnimation();

// Property animation (CSS/transform/SVG)
animation.animate(selector, props, { start, end, easing? })
// props: { opacity: [from, to], translateY: [from, to], width: [from, to, '%'] }
// end: seconds or 'auto' (= beat's total duration)

// Stagger across numbered elements (selector uses {i} placeholder)
animation.stagger(selector, count, props, { start, stagger, duration, easing? })

// Typewriter effect
animation.typewriter(selector, text, { start, end })

// Animated counter
animation.counter(selector, [from, to], { start, end, prefix?, suffix?, decimals? })

// Code reveal — show lines one by one (line-level typewriter)
animation.codeReveal(selector, linesArray, { start, end })

// Blink — periodic show/hide toggle (e.g. cursor)
animation.blink(selector, { interval? })  // interval: half-cycle seconds (default 0.5)

// Cover zoom — keep media fully covering its container while zooming
animation.coverZoom(selector, { containerSelector?, zoomFrom, zoomTo, start, end, easing? })

// Cover pan — keep media fully covering its container while panning
// distance can be large; runtime clamps actual movement to avoid black borders
animation.coverPan(selector, { containerSelector?, axis, direction, distance, zoom, start, end, easing? })

// Auto-render: if variable is named `animation`, render() is auto-generated.
// No need to define render() manually:
// (template auto-generates: window.render = function(f,t,fps) { animation.update(f,fps); })
```

#### Property types

| Property | Applied as | Default unit |
|----------|-----------|-------------|
| `translateX`, `translateY` | CSS transform | px |
| `scale` | CSS transform | (none) |
| `rotate` | CSS transform | deg |
| `rotateX`, `rotateY`, `rotateZ` | CSS transform (3D rotation) | deg |
| `opacity` | style.opacity | (none) |
| Other CSS (`width`, etc.) | style[prop] | px (override with `[from, to, '%']`) |
| SVG attrs (`r`, `cx`, etc.) | setAttribute | (none) |

## Pattern: MulmoAnimation with auto-render (recommended for most cases)

```json
{
  "html": [
    "<div class='h-full flex flex-col items-center justify-center bg-slate-900'>",
    "  <h1 id='title' class='text-5xl font-bold text-white' style='opacity:0'>Title</h1>",
    "  <p id='sub' class='text-xl text-blue-300' style='opacity:0'>Subtitle</p>",
    "</div>"
  ],
  "script": [
    "const animation = new MulmoAnimation();",
    "animation.animate('#title', { opacity: [0, 1], translateY: [30, 0] }, { start: 0, end: 0.5, easing: 'easeOut' });",
    "animation.animate('#sub', { opacity: [0, 1] }, { start: 0.3, end: 0.8 });"
  ]
}
```

No `render()` needed — auto-render detects the `animation` variable and generates it automatically.

## Pattern: interpolate (for complex/custom logic)

```json
{
  "html": [
    "<div class='h-full flex items-center justify-center bg-gray-900'>",
    "  <svg viewBox='0 0 400 400'>",
    "    <circle id='c' cx='200' cy='200' r='0' fill='none' stroke='#06b6d4' stroke-width='3' />",
    "  </svg>",
    "</div>"
  ],
  "script": [
    "function render(frame, totalFrames, fps) {",
    "  var r = interpolate(frame, { input: { inMin: 0, inMax: totalFrames }, output: { outMin: 0, outMax: 150 }, easing: Easing.easeOut });",
    "  document.getElementById('c').setAttribute('r', r);",
    "}"
  ]
}
```

## Pattern: Stagger list items

```json
{
  "html": [
    "<div class='h-full flex flex-col items-center justify-center gap-4 px-16'>",
    "  <div id='item0' class='p-4 bg-blue-50 rounded-lg w-full' style='opacity:0'>Item 1</div>",
    "  <div id='item1' class='p-4 bg-green-50 rounded-lg w-full' style='opacity:0'>Item 2</div>",
    "  <div id='item2' class='p-4 bg-purple-50 rounded-lg w-full' style='opacity:0'>Item 3</div>",
    "</div>"
  ],
  "script": [
    "const animation = new MulmoAnimation();",
    "animation.stagger('#item{i}', 3, { opacity: [0, 1], translateX: [-40, 0] }, { start: 0, stagger: 0.3, duration: 0.5, easing: 'easeOut' });"
  ]
}
```

## Pattern: Code reveal with cursor blink

```json
{
  "html": [
    "<div class='h-full flex flex-col items-center justify-center bg-gray-900 px-16'>",
    "  <pre id='code' class='text-lg font-mono text-green-400'></pre>",
    "  <span id='cursor' class='text-lg font-mono text-green-400'>|</span>",
    "</div>"
  ],
  "script": [
    "var codeLines = ['function hello() {', '  return \"world\";', '}'];",
    "const animation = new MulmoAnimation();",
    "animation.codeReveal('#code', codeLines, { start: 0.2, end: 2.5 });",
    "animation.blink('#cursor', { interval: 0.35 });"
  ]
}
```

## Constraints

- `animation` and `moviePrompt` cannot be used together on the same beat
- Do NOT set `duration` on animated beats — it is auto-calculated from the audio. Setting it explicitly can cause audio/video desync. Only set `duration` for silent beats or fixed-length intros.
- `end: 'auto'` uses the beat's total duration (`totalFrames / fps`) as the end time — useful for full-beat animations like scrolling crawls
- CSS animations/transitions are disabled in the template (deterministic frame rendering)
- All elements that will be animated should have initial styles set inline (e.g., `style='opacity:0'`)

## Image Animation Patterns

Embed real images inside animated beats. Sample: `scripts/samples/image_animation_showcase.json`

### Critical Rules

1. **Variable name must be `animation`** — auto-render checks `typeof animation !== 'undefined'`. Using `const a = ...` silently fails.
2. **Wrap `<img>` in `<div>` for transforms** — animate the wrapper, not `<img>` directly (`object-fit:cover` conflicts with transforms).
3. **Use relative paths from the script file** — relative `src` paths are automatically resolved to `file://` absolute paths at render time. Example: if the script is at `scripts/samples/foo.json`, use `../../output/images/bar.png`. Absolute `file://` paths also work but are not portable.

### Pattern: Ken Burns (zoom + pan)

```json
"html": [
  "<div class='h-full w-full overflow-hidden relative bg-black'>",
  "  <div id='photo_wrap' style='position:absolute;inset:0;overflow:hidden'>",
  "    <img id='photo_img' src='../../output/images/sample/photo.png' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:none;max-height:none' />",
  "  </div>",
  "</div>"
],
"script": [
  "const animation = new MulmoAnimation();",
  "animation.coverPan('#photo_img', { containerSelector: '#photo_wrap', axis: 'x', direction: 1, distance: 100, zoom: 1.2, start: 0, end: 'auto', easing: 'linear' });"
]
```

### Pattern: Image Carousel (cross-fade)

```json
"html": [
  "<div id='w0' style='position:absolute;inset:0'><img src='../../output/images/sample/img1.png' style='width:100%;height:100%;object-fit:cover' /></div>",
  "<div id='w1' style='position:absolute;inset:0;opacity:0'><img src='../../output/images/sample/img2.png' style='width:100%;height:100%;object-fit:cover' /></div>"
],
"script": [
  "const animation = new MulmoAnimation();",
  "animation.animate('#w0', { scale: [1.0, 1.1] }, { start: 0, end: 2.0 });",
  "animation.animate('#w0', { opacity: [1, 0] }, { start: 1.6, end: 2.2 });",
  "animation.animate('#w1', { opacity: [0, 1] }, { start: 1.6, end: 2.2 });"
]
```

### Other Patterns

See `scripts/samples/image_animation_showcase.json` for complete examples of: text overlay, split reveal, zoom spotlight, parallax layers, HUD overlay, morphing grid.
