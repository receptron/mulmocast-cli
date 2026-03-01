---
name: vocab-chat
description: Create a vocabulary learning chat MulmoScript with messenger-style animated UI (voiceover approach). Use when the user wants to create vocabulary learning content.
argument-hint: "<word> (e.g., layover)"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: true
---

# /vocab-chat — Vocabulary Learning Chat Script

Create a messenger-style vocabulary chat video using MulmoCast's voiceover approach. The video shows an animated chat UI where a Tutor and Student discuss a target vocabulary word.

**Approach**: 3-section structure — intro beat + animated `html_tailwind` chat beat with `voice_over` beats + closing beat.

**IMPORTANT**: The voice_over group must NOT be the first or last beat. Always add intro/closing beats to avoid audio/video duration mismatch caused by `add_bgm_agent`'s introPadding/outroPadding.

---

## Phase 1: Content Generation

### Input
- Target word: `$ARGUMENTS` (e.g., "layover")
- If no word is given, ask the user

### Generate conversation
Create a 7-message dialogue between Tutor and Student:
1. Tutor asks a question using the word naturally
2. Student asks what the word means
3. Tutor explains the meaning
4. Student uses the word in a sentence
5. Tutor elaborates or gives context
6. Student responds naturally
7. Tutor encourages further use

**Guidelines**:
- Natural, conversational English
- Target word highlighted where it naturally appears
- 1-2 sentences per message

---

## Phase 2: Create Initial Script (without timing)

### Output directory

```bash
SCRIPTS_DIR="${MULMO_SCRIPTS_DIR:-my-scripts}"
```

Write the script to `${SCRIPTS_DIR}/test_vocab_chat_voiceover_{word}.json`.

### Template structure

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Vocabulary Chat: {word} (voiceover)",
  "canvasSize": { "width": 720, "height": 1280 },
  "speechParams": {
    "speakers": {
      "Tutor": { "voiceId": "shimmer", "displayName": { "en": "Tutor" } },
      "Student": { "voiceId": "echo", "displayName": { "en": "Student" } }
    }
  },
  "beats": [
    {
      "id": "intro",
      "speaker": "Tutor",
      "text": "Let's learn the word {word}.",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE INTRO TEMPLATE BELOW..."]
      }
    },
    {
      "id": "chat",
      "speaker": "Tutor",
      "text": "{first message text}",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE CHAT TEMPLATE BELOW..."],
        "script": ["...SEE ANIMATION SCRIPT BELOW..."],
        "animation": true
      }
    },
    {
      "id": "vo2",
      "speaker": "Student",
      "text": "{second message text}",
      "image": { "type": "voice_over" }
    },
    "... vo3 through vo7 ...",
    {
      "id": "closing",
      "speaker": "Tutor",
      "text": "Now you know the word {word}. Keep practicing!",
      "image": {
        "type": "html_tailwind",
        "html": ["...SEE CLOSING TEMPLATE BELOW..."]
      }
    }
  ]
}
```

**IMPORTANT**: In the initial script:
- Do NOT set `duration` on the intro, chat, or closing beats
- Do NOT set `startAt` on voice_over beats
- Set `showAt` to placeholder zeros: `var showAt = [0, 0, 0, 0, 0, 0, 0];`

### Intro beat template

```html
<div class='h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950'>
  <p class='text-cyan-300 text-2xl mb-4'>Today's Word</p>
  <h1 class='text-5xl font-bold text-white tracking-wide'>{word}</h1>
  <div class='h-1 w-48 bg-gradient-to-r from-cyan-400 to-indigo-400 mt-6 rounded'></div>
</div>
```

### Closing beat template

```html
<div class='h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950'>
  <p class='text-3xl text-white font-bold mb-4'>Great job!</p>
  <p class='text-2xl text-cyan-300'>You learned: <span class='font-semibold'>{word}</span></p>
  <p class='text-xl text-slate-400 mt-6'>Keep practicing in your daily conversations.</p>
</div>
```

### Chat HTML Template — English Only

```html
<div class='h-full flex flex-col bg-slate-900'>
  <div class='bg-gradient-to-r from-cyan-600 to-indigo-600 px-6 py-4'>
    <p class='text-white text-3xl font-bold'>Vocabulary Chat</p>
    <p class='text-cyan-100 text-2xl'>Learning: {word}</p>
  </div>
  <div class='flex-1 px-4 py-4 flex flex-col gap-3'>
    <!-- m1 through m7 message bubbles -->
  </div>
</div>
```

### Chat HTML Template — With Translation

When translation is enabled, add a `t{N}` element inside each message:

#### Tutor message (left-aligned, with translation):
```html
<div id='m{N}' class='flex gap-2 items-end' style='opacity:0'>
  <div class='w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0'>T</div>
  <div>
    <div class='bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[75%]'>
      <p class='text-white text-2xl leading-relaxed'>English with <span class='text-cyan-400 font-semibold'>{word}</span></p>
    </div>
    <p id='t{N}' class='text-slate-500 text-2xl mt-0.5 ml-2' style='opacity:0'>日本語訳</p>
  </div>
</div>
```

#### Student message (right-aligned, with translation):
```html
<div id='m{N}' class='flex gap-2 items-end justify-end' style='opacity:0'>
  <div>
    <div class='bg-indigo-600 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%]'>
      <p class='text-white text-2xl leading-relaxed'>English with <span class='text-indigo-300 font-semibold'>{word}</span></p>
    </div>
    <p id='t{N}' class='text-slate-500 text-2xl mt-0.5 mr-2 text-right' style='opacity:0'>日本語訳</p>
  </div>
  <div class='w-7 h-7 bg-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0'>S</div>
</div>
```

### Animation script (`image.script` field)

The animation code goes in a separate `"script"` field (not inside `html`).

For English only:
```json
"script": [
  "function render(frame, totalFrames, fps) {",
  "  var showAt = [0, 0, 0, 0, 0, 0, 0];",
  "  for (var i = 0; i < 7; i++) {",
  "    var el = document.getElementById('m' + (i + 1));",
  "    var start = showAt[i];",
  "    el.style.opacity = interpolate(frame, {input:{inMin:start,inMax:start+12},output:{outMin:0,outMax:1},easing:'easeOut'});",
  "    el.style.transform = 'translateY(' + interpolate(frame, {input:{inMin:start,inMax:start+12},output:{outMin:20,outMax:0},easing:'easeOut'}) + 'px)';",
  "  }",
  "}"
]
```

For English + Translation:
```json
"script": [
  "function render(frame, totalFrames, fps) {",
  "  var showAt = [0, 0, 0, 0, 0, 0, 0];",
  "  var showAtJa = [0, 0, 0, 0, 0, 0, 0];",
  "  for (var i = 0; i < 7; i++) {",
  "    var el = document.getElementById('m' + (i + 1));",
  "    var start = showAt[i];",
  "    el.style.opacity = interpolate(frame, {input:{inMin:start,inMax:start+12},output:{outMin:0,outMax:1},easing:'easeOut'});",
  "    el.style.transform = 'translateY(' + interpolate(frame, {input:{inMin:start,inMax:start+12},output:{outMin:20,outMax:0},easing:'easeOut'}) + 'px)';",
  "    var tl = document.getElementById('t' + (i + 1));",
  "    if (tl) {",
  "      var tstart = showAtJa[i];",
  "      tl.style.opacity = interpolate(frame, {input:{inMin:tstart,inMax:tstart+12},output:{outMin:0,outMax:1},easing:'easeOut'});",
  "    }",
  "  }",
  "}"
]
```

---

## Phase 3: Generate Audio & Calculate Timing

### Step 1: Generate audio

```bash
yarn audio ${SCRIPTS_DIR}/test_vocab_chat_voiceover_{word}.json
```

### Step 2: Run timing calculator

For English only:
```bash
npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts ${SCRIPTS_DIR}/test_vocab_chat_voiceover_{word}.json
```

For English + Translation (1 second delay):
```bash
npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts ${SCRIPTS_DIR}/test_vocab_chat_voiceover_{word}.json --translation-delay 1.0
```

The script automatically:
- Reads audio durations from the studio JSON (via ffprobe)
- Calculates `startAt` for each voice_over beat
- Calculates `showAt` (and `showAtJa`) frames for animation
- Sets `duration` on the parent beat
- Updates the script JSON in-place

Use `--dry-run` to preview calculations without modifying the file.

---

## Phase 4: Generate Movie

```bash
yarn movie ${SCRIPTS_DIR}/test_vocab_chat_voiceover_{word}.json
```

**CRITICAL**: Never use `-f` flag after timing is set. TTS generates different audio each time, invalidating the hardcoded timing.

Output: `output/test_vocab_chat_voiceover_{word}_en.mp4`

---

## Beat Structure Overview

| Beat | Type | Role |
|------|------|------|
| `intro` | html_tailwind (static) | Word introduction card |
| `chat` | html_tailwind (animated) + voice_over parent | Chat UI with 7 messages |
| `vo2`–`vo7` | voice_over | Audio for messages 2–7 |
| `closing` | html_tailwind (static) | Closing/summary card |

**Why intro/closing beats are required**: MulmoCast's `add_bgm_agent` adds `introPadding` (1s) before the first beat's audio and `outroPadding` (1s) after the last beat's audio. `movie.ts` adds matching visual padding only to the first and last beats via `getExtraPadding`. If the voice_over group is at the first/last position, voice_over beats are skipped in video processing, causing the visual padding to be lost — resulting in audio/video duration mismatch. By placing intro/closing beats at the edges, the padding is correctly applied to those static beats.

---

## Timing Calculation Details (for reference)

The `calc_voiceover_timing.ts` script uses these formulas:

| Value | Formula |
|-------|---------|
| `roundUp1(x)` | `Math.ceil(x * 10) / 10` |
| `startAt[i]` | `roundUp1(startAt[i-1] + audioDuration[i-1] + 0.3)` |
| `showAt[0]` | `Math.round(firstShowAtDelay * 30)` |
| `showAt[i]` (i>0) | `Math.round(startAt[i] * 30)` |
| `showAtJa[i]` | `showAt[i] + Math.round(delay * 30)` |
| `duration` | `roundUp1(startAt[last] + audioDuration[last] + 0.3)` |

Constants: `firstShowAtDelay = 1.0s` (first beat) or `0s` (middle beat), `fps = 30`, `gap = 0.3s`

---

## Reference

Timing calculation details: see `.claude/skills/vocab-chat/calc_voiceover_timing.ts` and the timing formulas above.
