# Plan: beat sound effects (`beat.soundEffects`)

## Goal

Let a MulmoScript play sound effects (tick-tock, slap, pop…) inside a beat: at a chosen time,
with its own volume, several per beat. Sound files are not bundled; they are referenced by url/path
(free CC0 sounds live in `receptron/mulmocast-media/soundeffects`).

## Schema (`src/types/schema.ts`)

```ts
soundEffects?: {
  source: MediaSource;   // url | path (base64 rejected)
  startAt?: number;      // seconds from when the beat appears on screen (= its html animation clock), default 0
  volume?: number;       // 0..4, default 1.0 (= narration gain at its default volume)
  duration?: number;     // max play length, cut with a 50 ms fade-out
  loop?: boolean;        // repeat; without duration, until the beat leaves the screen
}[]
```

Distinct from `soundEffectPrompt`, which generates audio for a movie beat with an AI model.

## Mixing (`src/agents/add_bgm_agent.ts`)

- `audio_graph_data.addBGM` now receives the context returned by `combineAudioFilesAgent`, which carries
  `studio.beats[].startAt`.
- Absolute time = `MulmoStudioContextMethods.getBeatScreenStartAt(i) + startAt`: 0 for the first beat
  (its segment absorbs the intro padding), `introPadding + studio.beats[i].startAt` for the others, which
  is also when their narration starts. This is the clock html_tailwind animations run on (frame 0 = the
  beat's first frame on screen), so an effect and an animation given the same time coincide. A looping
  effect without `duration` lasts `getBeatDuration(i) - startAt` (intro/outro padding included).
- Each effect: `aformat → [atrim + afade] → volume → adelay`; looping effects use `-stream_loop -1`.
  Effects are combined with `amix normalize=0`, then mixed onto `[music][voice]` with `normalize=0`
  before the limiter (explicit mode) and the final trim/fade.
- Legacy mode (`amix normalize=1` for music+voice) halves the voice, so effects get a 0.5 gain there
  to keep `volume: 1.0` equal to the narration's gain at its default volume.
- `audioVolume` / `ttsVolume` scale only the narration, not the effects: an effect's loudness is set by
  its own `volume` alone (e.g. `audioVolume: 0`, used to keep only the BGM, leaves effects audible).

The effects therefore land in the audio artifact (mp3) and, through it, in the movie (mp4).

## Tests

- `test/agents/test_add_bgm_agent.ts`: placement, defaults, loop/duration, filter strings.
- `scripts/test/test_sound_effects.json`: end-to-end sample (verified by subtracting a render without
  effects and checking the onsets with `silencedetect`).

## JingleScript sources

`source` may also be `{ kind: "jinglescript", score }`, a [JingleScript](https://github.com/receptron/jinglescript)
score synthesized locally (no samples, no network).

- Schema: `score` is `z.record(z.string(), z.unknown())`, so `@mulmocast/types` does not depend on
  jinglescript; the score is validated with jinglescript's `checkScore`.
- `src/utils/jinglescript.ts`: `renderJingleScores(context)` runs at the start of the `audio` action,
  before TTS. It checks every score (throwing with `beats[i].soundEffects[j].source.score: <path>: <message>`),
  then renders each to `<audioDir>/jingle_<sha256(score)>.wav` at 44.1 kHz, skipping cached files
  unless `force`.
- `getSoundEffectPlacements` resolves a jinglescript source to that file; the rest of the mix is unchanged.
