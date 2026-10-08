# Plan: beat sound effects (`beat.soundEffects`)

## Goal

Let a MulmoScript play sound effects (tick-tock, slap, pop…) inside a beat: at a chosen time,
with its own volume, several per beat. Sound files are not bundled; they are referenced by url/path
(free CC0 sounds live in `receptron/mulmocast-media/soundeffects`).

## Schema (`src/types/schema.ts`)

```ts
soundEffects?: {
  source: MediaSource;   // url | path (base64 rejected)
  startAt?: number;      // seconds from the beat start (narration start), default 0
  volume?: number;       // 0..4, default 1.0 (= narration gain at its default volume)
  duration?: number;     // max play length, cut with a 50 ms fade-out
  loop?: boolean;        // repeat; without duration, until the end of the beat
}[]
```

Distinct from `soundEffectPrompt`, which generates audio for a movie beat with an AI model.

## Mixing (`src/agents/add_bgm_agent.ts`)

- `audio_graph_data.addBGM` now receives the context returned by `combineAudioFilesAgent`, which carries
  `studio.beats[].startAt`.
- Absolute time = `introPadding + studio.beats[i].startAt + soundEffect.startAt` (the voice track is
  delayed by `introPadding` in the same agent).
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
