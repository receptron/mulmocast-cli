# Plan: a beat's voice from a JingleScript score (singing avatars)

## Goal

Let a character sing. A beat's audio can already come from a file instead of TTS
(`audio: { type: "audio", source }`), and an avatar lip-syncs to whatever a beat's audio is,
matched against its `text`. JingleScript 1.0 can sing a track with the user's NEUTRINO
(`"sing": { "engine": "neutrino" }` on a track). Joining the two: a beat whose audio is a
JingleScript score.

## Schema

`beat.audio` gains a third kind, next to `audio` and `midi`:

```json
{ "type": "jinglescript", "score": { "format": "jinglescript/1", "...": "..." } }
```

- The score is rendered when the audio is generated, cached by the hash of the score (the same file
  naming as sound effects: `jingle_<sha256>.wav` in the audio directory).
- It replaces TTS for the beat, as `type: "audio"` does; the beat's length is the rendered audio's.
- `text` stays the words: captions show it and the avatar matches the voice against it. For a sung
  beat it is the lyrics.
- Accompaniment can go in the same score (heard as the beat's voice) or, better for lip sync, in a
  second score as a sound effect of the beat at `at: 0` (the avatar then hears only the voice).

## Affected files

- `src/types/schema.ts`: `mulmoJingleScriptAudioSchema` in `mulmoAudioAssetSchema`.
- `src/utils/jinglescript.ts`: `getJingleScores` also lists beat audio scores; each has a
  `location` for error messages. `render()` is async from jinglescript 1.0 (it renders on a worker
  thread).
- `src/actions/audio.ts`: `getAudioPathOrUrl` returns the rendered file for a jinglescript beat.
- `test/utils/test_jinglescript.ts`: listing, validation and rendering of beat audio scores.
- `scripts/test/test_avatar_singing.json`: a sample in which a character introduces and sings a
  song over its accompaniment.
- `docs/avatar.md`: how to make an avatar sing.

## Not in scope

- Installing NEUTRINO: the user installs it (JingleScript finds it through `NEUTRINO_DIR`, default
  `/Applications/NEUTRINO`); a score that sings without it fails with JingleScript's message.
