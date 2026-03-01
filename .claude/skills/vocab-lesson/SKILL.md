---
name: vocab-lesson
description: Create a vocabulary learning lesson MulmoScript with multi-section structure (word display, examples with voice_over, explanation, review with translation). Use when the user wants to create vocabulary learning content with a lesson/presentation-style format rather than chat-style.
argument-hint: "<word> (e.g., serendipity)"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: true
---

# /vocab-lesson — Vocabulary Learning Animation Script

Create a multi-section vocabulary learning video using MulmoCast. The video presents a word through structured phases: intro, word display, example sentences (voice_over), meaning explanation, and review with translations.

**Key difference from `/vocab-chat`**: This uses a presentation-style layout with multiple visual sections, not a messenger chat UI. The examples section uses voice_over approach for smooth accumulated display.

---

## Phase 1: Content Generation

### Input
- Target word: `$ARGUMENTS` (e.g., "serendipity")
- If no word is given, ask the user

### Generate content
1. **Phonetic transcription** (IPA format)
2. **3 example sentences** using the word naturally, with increasing complexity
3. **Meaning explanation** in English (2-3 sentences)
4. **Japanese meaning** (natural Japanese, not literal translation)
5. **Japanese translation** for each example sentence

---

## Phase 2: Create Initial Script (without timing)

### Output directory

```bash
SCRIPTS_DIR="${MULMO_SCRIPTS_DIR:-my-scripts}"
```

Write the script to `${SCRIPTS_DIR}/test_vocab_animation_{word}.json`.

### Beat structure overview

| Beat ID | Type | Section | Duration |
|---------|------|---------|----------|
| `audio_intro` | html_tailwind | Dark intro (word spoken) | *(なし — 音声長に依存)* |
| `word_display` | html_tailwind + animation | Word + phonetic display | 4 |
| `examples` | html_tailwind + animation + **voice_over parent** | 3 example sentences (accumulated slide-in) | *(calc_voiceover_timing で設定)* |
| `example_vo2` | voice_over | 2nd example audio | *(calc_voiceover_timing で設定)* |
| `example_vo3` | voice_over | 3rd example audio | *(calc_voiceover_timing で設定)* |
| `explanation` | html_tailwind + animation | English + Japanese meaning | *(初期値 12 → calc_lesson_timing で更新)* |
| `review_1` | html_tailwind + animation | Example 1 + Japanese translation | *(初期値 7 → calc_lesson_timing で更新)* |
| `review_2` | html_tailwind + animation | Example 2 + Japanese translation | *(初期値 6 → calc_lesson_timing で更新)* |
| `review_3` | html_tailwind + animation | Example 3 + Japanese translation | *(初期値 8 → calc_lesson_timing で更新)* |

### Text size rules
- Word display: `text-5xl` (48px)
- Section headings: `text-3xl` (30px)
- English content: `text-3xl` (30px)
- Japanese content: `text-2xl` (24px) — minimum
- Labels: `text-2xl` (24px)
- Phonetic: `text-2xl` (24px)

### Color scheme
- Background: `bg-slate-900` / gradient `from-slate-900 to-indigo-950`
- Content cards: `bg-slate-800 rounded-xl`
- Example border colors (cycle): `border-cyan-400`, `border-indigo-400`, `border-purple-400`
- Highlighted word colors: `text-cyan-400`, `text-indigo-400`, `text-purple-400`

### Template — Script JSON structure

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "title": "Vocabulary: {word}",
  "canvasSize": { "width": 720, "height": 1280 },
  "speechParams": {
    "speakers": {
      "Presenter": { "voiceId": "shimmer", "displayName": { "en": "Presenter" } }
    }
  },
  "beats": [
    "...SEE BEAT TEMPLATES BELOW..."
  ]
}
```

### Beat 1: audio_intro

Dark screen with the word spoken. Do NOT set `duration` — the beat length is automatically determined by the generated audio length. (Setting a fixed `duration` would cause audio/visual mismatch.)

```json
{
  "id": "audio_intro",
  "speaker": "Presenter",
  "text": "{word}.",
  "image": {
    "type": "html_tailwind",
    "html": "<div class='h-full bg-slate-900'></div>"
  }
}
```

### Beat 2: word_display

Animated word appearance with phonetic and underline.

```json
{
  "id": "word_display",
  "speaker": "Presenter",
  "text": "{word}.",
  "duration": 4,
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950'>",
      "  <p id='phonetic' class='text-2xl text-indigo-300 font-mono mb-4' style='opacity:0'>{IPA}</p>",
      "  <h1 id='word' class='text-5xl font-bold text-white tracking-wide' style='opacity:0'>{word}</h1>",
      "  <div id='underline' class='h-1 bg-gradient-to-r from-cyan-400 to-indigo-400 mt-6 rounded' style='width:0'></div>",
      "</div>"
    ],
    "script": [
      "const anim = new MulmoAnimation();",
      "anim.animate('#word', { opacity: [0, 1], scale: [0.9, 1] }, { start: 0, end: 0.4, easing: 'easeOut' });",
      "anim.animate('#phonetic', { opacity: [0, 1] }, { start: 0.3, end: 0.7 });",
      "anim.animate('#underline', { width: [0, 300, 'px'] }, { start: 0.5, end: 1.2, easing: 'easeInOut' });",
      "function render(frame, totalFrames, fps) { anim.update(frame, fps); }"
    ],
    "animation": true
  }
}
```

### Beats 3-5: examples (voice_over group)

Parent beat with all 3 examples. Each slides in from the left at its showAt frame.
Do NOT set `duration` or `startAt` — the calc script handles these.

**Parent beat:**
```json
{
  "id": "examples",
  "speaker": "Presenter",
  "text": "{example sentence 1}",
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex flex-col justify-start pt-12 bg-slate-900 px-8'>",
      "  <h2 class='text-3xl font-bold text-indigo-300 mb-8'>Example Sentences</h2>",
      "  <div id='s0' class='mb-6 p-5 bg-slate-800 rounded-xl border-l-4 border-cyan-400' style='opacity:0; transform: translateX(-30px)'>",
      "    <p class='text-3xl text-white leading-relaxed'>{example 1 with <span class='text-cyan-400 font-semibold'>{word}</span>}</p>",
      "  </div>",
      "  <div id='s1' class='mb-6 p-5 bg-slate-800 rounded-xl border-l-4 border-indigo-400' style='opacity:0; transform: translateX(-30px)'>",
      "    <p class='text-3xl text-white leading-relaxed'>{example 2 with <span class='text-indigo-400 font-semibold'>{word}</span>}</p>",
      "  </div>",
      "  <div id='s2' class='mb-6 p-5 bg-slate-800 rounded-xl border-l-4 border-purple-400' style='opacity:0; transform: translateX(-30px)'>",
      "    <p class='text-3xl text-white leading-relaxed'>{example 3 with <span class='text-purple-400 font-semibold'>{word}</span>}</p>",
      "  </div>",
      "</div>"
    ],
    "script": [
      "function render(frame, totalFrames, fps) {",
      "  var showAt = [0, 0, 0];",
      "  for (var i = 0; i < 3; i++) {",
      "    var el = document.getElementById('s' + i);",
      "    var start = showAt[i];",
      "    el.style.opacity = interpolate(frame, {input:{inMin:start,inMax:start+15},output:{outMin:0,outMax:1},easing:'easeOut'});",
      "    el.style.transform = 'translateX(' + interpolate(frame, {input:{inMin:start,inMax:start+15},output:{outMin:-30,outMax:0},easing:'easeOut'}) + 'px)';",
      "  }",
      "}"
    ],
    "animation": true
  }
}
```

**Voice_over beats:**
```json
{
  "id": "example_vo2",
  "speaker": "Presenter",
  "text": "{example sentence 2}",
  "image": { "type": "voice_over" }
},
{
  "id": "example_vo3",
  "speaker": "Presenter",
  "text": "{example sentence 3}",
  "image": { "type": "voice_over" }
}
```

### Beat 6: explanation

English meaning fades in immediately, Japanese meaning fades in at ~9.3 seconds.

```json
{
  "id": "explanation",
  "speaker": "Presenter",
  "text": "{English meaning}",
  "duration": 12,
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex flex-col justify-start pt-12 bg-slate-900 px-8'>",
      "  <h2 class='text-3xl font-bold text-indigo-300 mb-8'>Meaning</h2>",
      "  <div id='en-block' class='mb-6 p-6 bg-slate-800 rounded-xl' style='opacity:0'>",
      "    <p class='text-2xl text-cyan-400 font-mono mb-2'>English</p>",
      "    <p class='text-3xl text-white leading-relaxed'>{English meaning}</p>",
      "  </div>",
      "  <div id='ja-block' class='p-6 bg-slate-800 rounded-xl' style='opacity:0'>",
      "    <p class='text-2xl text-indigo-400 font-mono mb-2'>日本語</p>",
      "    <p class='text-2xl text-slate-200 leading-relaxed'>{Japanese meaning}</p>",
      "  </div>",
      "</div>"
    ],
    "script": [
      "const anim = new MulmoAnimation();",
      "anim.animate('#en-block', { opacity: [0, 1], translateY: [15, 0] }, { start: 0, end: 0.5, easing: 'easeOut' });",
      "anim.animate('#ja-block', { opacity: [0, 1], translateY: [15, 0] }, { start: 9.3, end: 9.8, easing: 'easeOut' });",
      "function render(frame, totalFrames, fps) { anim.update(frame, fps); }"
    ],
    "animation": true
  }
}
```

### Beats 7-9: review (with translation)

Each review beat shows one English example (always visible) and its Japanese translation (fade in after a delay). The fade-in timing should be proportional to the duration:
- `review_1` (duration 7): translation at ~4.0s
- `review_2` (duration 6): translation at ~3.1s
- `review_3` (duration 8): translation at ~5.0s

```json
{
  "id": "review_{N}",
  "speaker": "Presenter",
  "text": "{example sentence N}",
  "duration": {duration},
  "image": {
    "type": "html_tailwind",
    "html": [
      "<div class='h-full flex flex-col justify-center bg-slate-900 px-8'>",
      "  <div class='mb-4 p-6 bg-slate-800 rounded-xl border-l-4 border-{color}-400'>",
      "    <p class='text-3xl text-white leading-relaxed'>{English with <span class='text-{color}-400 font-semibold'>{word}</span>}</p>",
      "  </div>",
      "  <div id='tr{N}' class='p-5 bg-slate-800/50 rounded-xl ml-8' style='opacity:0'>",
      "    <p class='text-2xl text-slate-300 leading-relaxed'>{Japanese translation}</p>",
      "  </div>",
      "</div>"
    ],
    "script": [
      "const anim = new MulmoAnimation();",
      "anim.animate('#tr{N}', { opacity: [0, 1], translateY: [10, 0] }, { start: {fadeStartSec}, end: {fadeStartSec} + 0.5, easing: 'easeOut' });",
      "function render(frame, totalFrames, fps) { anim.update(frame, fps); }"
    ],
    "animation": true
  }
}
```

Color cycle for review beats: cyan → indigo → purple (matching example colors).

**Note on `duration`**: The initial `duration` values for `explanation` and `review_*` beats are placeholders — `calc_lesson_timing.ts` (Phase 3, Step 3) overwrites them based on actual audio length. If you skip the calc step or set `duration` manually, ensure it is longer than the TTS audio; otherwise the beat ends before the audio finishes and the remaining audio spills into the next beat's visual.

---

## Phase 3: Generate Audio & Calculate Timing

### Step 1: Generate audio

```bash
yarn audio ${SCRIPTS_DIR}/test_vocab_animation_{word}.json
```

### Step 2: Run voice_over timing calculator

**IMPORTANT**: This step must complete before Step 3.

```bash
npx tsx .claude/skills/vocab-lesson/calc_voiceover_timing.ts ${SCRIPTS_DIR}/test_vocab_animation_{word}.json
```

Calculates for the `examples` voice_over group:
- `duration` on the `examples` parent beat
- `startAt` on `example_vo2` and `example_vo3`
- `showAt` frames in the animation script

### Step 3: Run lesson timing calculator

**IMPORTANT**: Run after Step 2. This step depends on the voice_over timing being already set.

```bash
npx tsx .claude/skills/vocab-lesson/calc_lesson_timing.ts ${SCRIPTS_DIR}/test_vocab_animation_{word}.json
```

Calculates for `explanation` and `review_*` beats:
- `duration = audio_length + 4.0s` (Japanese display padding)
- Japanese fade-in start = `audio_length + 0.5s`

Options:
- `--ja-padding <seconds>` — extra time after audio for Japanese display (default: 4.0)
- `--ja-gap <seconds>` — gap between audio end and Japanese fade-in (default: 0.5)
- `--dry-run` — preview without modifying file

---

## Phase 4: Generate Movie

```bash
yarn movie ${SCRIPTS_DIR}/test_vocab_animation_{word}.json
```

**CRITICAL**: Never use `-f` flag after timing is set. TTS generates different audio each time, invalidating the hardcoded timing.

Output: `output/test_vocab_animation_{word}_en.mp4`

---

## Reference

- Voice_over timing: `.claude/skills/vocab-lesson/calc_voiceover_timing.ts`
- Lesson timing (explanation/review): `.claude/skills/vocab-lesson/calc_lesson_timing.ts`
