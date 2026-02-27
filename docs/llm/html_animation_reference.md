# html_tailwind Animation API Reference

This is a concise reference for generating animated html_tailwind beats in MulmoScript.
The runtime template injects helper functions (`interpolate`, `Easing`, `MulmoAnimation`) that are available in the `script` field.

## Beat Structure

```json
{
  "duration": 3,
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
- `duration`: Required (seconds). totalFrames = floor(duration * fps)

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

Declarative animation helper. Times (`start`, `end`) are in **seconds**.

```javascript
const animation = new MulmoAnimation();

// Property animation (CSS/transform/SVG)
animation.animate(selector, props, { start, end, easing? })
// props: { opacity: [from, to], translateY: [from, to], width: [from, to, '%'] }

// Stagger across numbered elements (selector uses {i} placeholder)
animation.stagger(selector, count, props, { start, stagger, duration, easing? })

// Typewriter effect
animation.typewriter(selector, text, { start, end })

// Animated counter
animation.counter(selector, [from, to], { start, end, prefix?, suffix?, decimals? })

// Call in render():
function render(frame, totalFrames, fps) { animation.update(frame, fps); }
```

#### Property types

| Property | Applied as | Default unit |
|----------|-----------|-------------|
| `translateX`, `translateY` | CSS transform | px |
| `scale` | CSS transform | (none) |
| `rotate` | CSS transform | deg |
| `opacity` | style.opacity | (none) |
| Other CSS (`width`, etc.) | style[prop] | px (override with `[from, to, '%']`) |
| SVG attrs (`r`, `cx`, etc.) | setAttribute | (none) |

## Pattern: MulmoAnimation (recommended for most cases)

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
    "animation.animate('#sub', { opacity: [0, 1] }, { start: 0.3, end: 0.8 });",
    "function render(frame, totalFrames, fps) { animation.update(frame, fps); }"
  ]
}
```

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
    "animation.stagger('#item{i}', 3, { opacity: [0, 1], translateX: [-40, 0] }, { start: 0, stagger: 0.3, duration: 0.5, easing: 'easeOut' });",
    "function render(frame, totalFrames, fps) { animation.update(frame, fps); }"
  ]
}
```

## Constraints

- `animation` and `moviePrompt` cannot be used together on the same beat
- `duration` is required when `animation` is set
- CSS animations/transitions are disabled in the template (deterministic frame rendering)
