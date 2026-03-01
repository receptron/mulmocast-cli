---
name: conversation-chat
description: Create a conversation practice chat MulmoScript with speech bubble UI and character illustration (voiceover approach). Use when the user wants to create English conversation practice content.
argument-hint: "<topic> (e.g., ordering coffee)"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: true
---

# /conversation-chat — Conversation Practice Chat Script

Create a speech-bubble style conversation practice video using MulmoCast's voiceover approach. The video shows animated speech bubbles appearing one at a time over a background gradient with a character illustration at the bottom.

**Approach**: 3-section structure — intro beat + animated `html_tailwind` chat beat with `voice_over` beats + closing beat.
**Visual style**: Absolute-positioned speech bubbles with SVG tails, fade-in/fade-out animation (one bubble visible at a time), character PNG at the bottom.

**IMPORTANT**: The voice_over group must NOT be the first or last beat. Always add intro/closing beats to avoid audio/video duration mismatch caused by `add_bgm_agent`'s introPadding/outroPadding.

---

## Phase 1: Content Generation

### Input
- Topic: `$ARGUMENTS` (e.g., "ordering coffee", "asking for directions", "job interview")
- If no topic is given, ask the user

### Generate conversation
Create a 7-10 message dialogue between two speakers:
- Natural, realistic English for the given situation
- Include common phrases and expressions for the topic
- Each message: 1-2 sentences
- Speakers should demonstrate typical interaction patterns

### Speaker roles

Choose appropriate speakers based on the topic:

| Topic Type | Speaker A | Speaker B |
|-----------|-----------|-----------|
| Service | Customer | Staff/Server/Clerk |
| Travel | Traveler | Local/Agent |
| Daily life | Friend A (name) | Friend B (name) |
| Work | Colleague A (name) | Colleague B (name) |
| Learning | Teacher | Student |

Choose `voiceId` from: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

---

## Phase 2: Create Initial Script (without timing)

### Output directory

```bash
SCRIPTS_DIR="${MULMO_SCRIPTS_DIR:-my-scripts}"
```

Write the script to `${SCRIPTS_DIR}/test_conversation_{topic_slug}.json`.

### Template structure

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Conversation: {topic}",
  "canvasSize": { "width": 720, "height": 1280 },
  "speechParams": {
    "speakers": {
      "{SpeakerA}": { "voiceId": "shimmer", "displayName": { "en": "{SpeakerA}" } },
      "{SpeakerB}": { "voiceId": "echo", "displayName": { "en": "{SpeakerB}" } }
    }
  },
  "beats": [
    {
      "id": "intro",
      "speaker": "{SpeakerA}",
      "text": "{intro text, e.g. 'Let's practice ordering coffee.'}",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE INTRO TEMPLATE BELOW..."]
      }
    },
    {
      "id": "chat",
      "speaker": "{SpeakerA}",
      "text": "{first message text}",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE HTML TEMPLATE BELOW..."],
        "script": ["...SEE ANIMATION SCRIPT BELOW..."],
        "animation": true
      }
    },
    {
      "id": "vo2",
      "speaker": "{SpeakerB}",
      "text": "{second message text}",
      "image": { "type": "voice_over" }
    },
    "... vo3 through voN ...",
    {
      "id": "closing",
      "speaker": "{SpeakerA}",
      "text": "{closing text, e.g. 'Great practice! Try using these phrases next time.'}",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE CLOSING TEMPLATE BELOW..."]
      }
    }
  ]
}
```

**IMPORTANT**: In the initial script:
- Do NOT set `duration` on any beat (intro, chat, closing)
- Do NOT set `startAt` on voice_over beats
- Set `showAt` to placeholder zeros (e.g., `[0, 0, 0, ...]`). The element count does not need to match the message count — `calc_voiceover_timing.ts` overwrites the entire array

### Intro beat template

```html
<div class='h-full flex flex-col items-center justify-center' style='background:linear-gradient(180deg,#d0ecf8 0%,#a3d9f3 50%,#94d4ed 100%)'>
  <p class='text-cyan-700 text-2xl mb-4'>Conversation Practice</p>
  <h1 class='text-4xl font-bold text-slate-800 text-center px-8'>{topic title}</h1>
  <div class='h-1 w-48 bg-gradient-to-r from-blue-400 to-emerald-400 mt-6 rounded'></div>
</div>
```

### Closing beat template

```html
<div class='h-full flex flex-col items-center justify-center' style='background:linear-gradient(180deg,#d0ecf8 0%,#a3d9f3 50%,#94d4ed 100%)'>
  <p class='text-3xl text-slate-800 font-bold mb-4'>Great practice!</p>
  <p class='text-2xl text-cyan-700 text-center px-8'>Try using these phrases next time.</p>
</div>
```

### Background gradient color

The background gradient must blend seamlessly with the character PNG's top edge.

**How to determine the gradient colors:**
1. Use ImageMagick to sample the PNG's top edge color:
   ```bash
   magick .claude/skills/conversation-chat/tutor_student.png -flatten -crop 1x1+1024+0 -format '%[pixel:u.p{0,0}]' info:
   ```
2. Set the gradient's bottom color to the sampled color (e.g., `#94d4ed`)
3. Set the top/middle colors to progressively lighter tints of the same hue

Current PNG top edge: `#94d4ed` (light blue) → use gradient: `#d0ecf8 → #a3d9f3 → #94d4ed`

**Bubble colors** (fixed, matching the Learning theme):
- Speaker A: `bg-white` / `text-blue-600` / SVG fill `white`
- Speaker B: `bg-emerald-50` / `text-emerald-600` / SVG fill `#ecfdf5`

### Character image

Use the character illustration at the bottom of the screen:
```
.claude/skills/conversation-chat/tutor_student.png
```

Reference with absolute `file://` path in the HTML:
```html
<img src='file://{absolute_path}/.claude/skills/conversation-chat/tutor_student.png' class='absolute bottom-0 w-full' style='image-rendering:auto'>
```

Determine the absolute path by reading the current working directory.

### HTML structure

```html
<div class='h-full relative overflow-hidden' style='background:linear-gradient(180deg,{color1} 0%,{color2} 50%,{color3} 100%)'>
  <div class='w-full text-center pt-5'>
    <p class='text-3xl font-bold text-slate-800'>{title}</p>
  </div>
  <!-- b1 through bN speech bubbles (absolute positioned) -->
  <img src='file://{path}/assets/images/tutor_student.png' class='absolute bottom-0 w-full' style='image-rendering:auto'>
</div>
```

#### Speaker A speech bubble (left-aligned):
```html
<div id='b{N}' class='absolute left-4 w-3/4 z-10' style='bottom:720px;opacity:0'>
  <div class='bg-white rounded-2xl px-5 py-4 shadow-xl'>
    <p class='text-2xl text-slate-800 leading-relaxed'>Message with <span class='text-blue-600 font-bold'>keyword</span> highlighted.</p>
  </div>
  <svg class='ml-10 -mt-px' width='24' height='14'><polygon points='0,0 24,0 12,14' fill='white'/></svg>
</div>
```

#### Speaker B speech bubble (right-aligned):
```html
<div id='b{N}' class='absolute right-4 w-3/4 z-10' style='bottom:720px;opacity:0'>
  <div class='bg-emerald-50 rounded-2xl px-5 py-4 shadow-xl'>
    <p class='text-2xl text-slate-800 leading-relaxed'>Message with <span class='text-emerald-600 font-bold'>keyword</span> highlighted.</p>
  </div>
  <svg class='ml-auto mr-10 -mt-px' width='24' height='14'><polygon points='0,0 24,0 12,14' fill='#ecfdf5'/></svg>
</div>
```

**Note**: The SVG tail `fill` color must match the bubble background as a hex value (e.g., `bg-emerald-50` → `fill='#ecfdf5'`).

### Bubble positioning

All bubbles use `bottom:720px` (screen center for 1280px canvas) to align their bottom edge at the same position regardless of message length.

### Key phrase highlighting

Highlight the topic keyword or useful phrases in each message:
- Speaker A: `<span class='{highlight_A} font-bold'>keyword</span>`
- Speaker B: `<span class='{highlight_B} font-bold'>keyword</span>`

### Animation script (`image.script` field)

The animation code goes in a separate `"script"` field (not inside `html`).

Each bubble fades in when it's that message's turn, and fades out when the next message appears.

Replace `{messageCount}` with the actual number of messages (e.g., `8`). It appears in **2 places** (`i < {messageCount}` and `i < {messageCount} - 1`) — ensure both are replaced.

```json
"script": [
  "function render(frame, totalFrames, fps) {",
  "  var showAt = [0, 0, 0, 0, 0, 0, 0];",
  "  for (var i = 0; i < {messageCount}; i++) {",
  "    var el = document.getElementById('b' + (i + 1));",
  "    var start = showAt[i];",
  "    var next = (i < {messageCount} - 1) ? showAt[i + 1] : totalFrames;",
  "    var fi = interpolate(frame, {input:{inMin:start,inMax:start+15},output:{outMin:0,outMax:1},easing:'easeOut'});",
  "    var fo = (i < {messageCount} - 1) ? (1 - interpolate(frame, {input:{inMin:next-8,inMax:next},output:{outMin:0,outMax:1}})) : 1;",
  "    el.style.opacity = Math.min(fi, fo);",
  "    el.style.transform = 'translateY(' + interpolate(frame, {input:{inMin:start,inMax:start+15},output:{outMin:15,outMax:0},easing:'easeOut'}) + 'px)';",
  "  }",
  "}"
]
```

**Runtime API** (`assets/html/tailwind_animated.html`):
```js
interpolate(value, { input: { inMin, inMax }, output: { outMin, outMax }, easing })
// easing: 'linear' (default) | 'easeIn' | 'easeOut' | 'easeInOut' — string or function
```

Key animation behavior:
- `fi` (fade-in): easeOut over 15 frames (0.5s)
- `fo` (fade-out): linear over 8 frames before the next message appears
- Last message stays visible (`fo = 1`)
- `Math.min(fi, fo)` ensures smooth transitions

---

## Phase 3: Generate Audio & Calculate Timing

### Step 1: Generate audio

```bash
yarn audio ${SCRIPTS_DIR}/test_conversation_{topic_slug}.json
```

### Step 2: Run timing calculator

```bash
npx tsx .claude/skills/conversation-chat/calc_voiceover_timing.ts ${SCRIPTS_DIR}/test_conversation_{topic_slug}.json
```

The script automatically:
- Reads audio durations from the studio JSON (via ffprobe)
- Calculates `startAt` for each voice_over beat
- Calculates `showAt` frames for animation
- Sets `duration` on the parent beat
- Updates the script JSON in-place

Use `--dry-run` to preview calculations without modifying the file.

---

## Phase 4: Generate Movie

```bash
yarn movie ${SCRIPTS_DIR}/test_conversation_{topic_slug}.json
```

**CRITICAL**: Never use `-f` flag after timing is set. TTS generates different audio each time, invalidating the hardcoded timing.

Output: `output/test_conversation_{topic_slug}_en.mp4`

---

## Beat Structure Overview

| Beat | Type | Role |
|------|------|------|
| `intro` | html_tailwind (static) | Topic introduction card |
| `chat` | html_tailwind (animated) + voice_over parent | Speech bubbles with character |
| `vo2`–`voN` | voice_over | Audio for messages 2–N |
| `closing` | html_tailwind (static) | Closing/summary card |

**Why intro/closing beats are required**: MulmoCast's `add_bgm_agent` adds `introPadding` (1s) before the first beat's audio and `outroPadding` (1s) after the last beat's audio. `movie.ts` adds matching visual padding only to the first and last beats via `getExtraPadding`. If the voice_over group is at the first/last position, voice_over beats are skipped in video processing, causing the visual padding to be lost — resulting in audio/video duration mismatch. By placing intro/closing beats at the edges, the padding is correctly applied to those static beats.

**Animation timing note**: Because the `chat` beat is in the middle (not the first beat), `calc_voiceover_timing.ts` sets `firstShowAtDelay = 0`. This means the first speech bubble appears immediately when the chat beat starts, without a 1-second delay. This is the intended behavior — the intro beat already provides the visual lead-in.

---

## Reference

Timing calculation details: see `.claude/skills/conversation-chat/calc_voiceover_timing.ts` and `/vocab-chat` skill.
