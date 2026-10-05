# Plan: talking avatars over slides (AvatarScript)

## Goal

Let a MulmoScript name an avatar for a speaker, and show that avatar over the beat visuals
(Markdown/HTML slides, images, movies), speaking the narration with lip sync. The avatar is
rendered by [AvatarScript](https://github.com/receptron/avatarscript) (npm `avatarscript`), which
turns an avatar package plus speech audio and its text into a lip-synced, see-through video.

The existing lipSync feature does not fit: its output replaces the whole beat visual, and on a
slide beat it would animate the slide image itself.

## Schema (MulmoScript)

Everything is optional; a script without `avatar` renders exactly as before.

```jsonc
{
  "avatarParams": { "position": { "x": "84%", "y": "100%", "scale": "62%" } },   // script defaults
  "speechParams": {
    "speakers": {
      "Miko": {
        "provider": "openai", "voiceId": "coral",
        "avatar": { "source": "./avatars/miko-qipao" }        // the avatar this speaker speaks with
      }
    }
  },
  "beats": [
    {
      "speaker": "Miko", "text": "みなさん、こんにちは！",
      "image": { "type": "markdown", "markdown": ["# Hello"] },
      "avatarParams": { "emotion": "happy", "motions": [{ "motion": "nod", "at": "こんにちは" }] }
    },
    { "speaker": "Miko", "text": "…", "avatarParams": { "hidden": true } }
  ]
}
```

- `speakers.<name>.avatar` — `{ source, position? }`. `source` is an AvatarScript avatar package
  (a folder with `avatar.json`, or a mesh-avatar-studio project), relative to the script file.
  A `lang` override of the speaker keeps the base speaker's avatar unless it names its own.
- `avatarParams` — on the script (defaults) and on a beat (overrides):
  - `position`: `x` (horizontal centre, % of canvas width, default `84%`), `y` (bottom edge, % of
    canvas height, default `100%`), `scale` (height, % of canvas height, default `62%`). Precedence:
    beat → speaker avatar → script → default. Only the first beat's position of a track is used
    (a track does not move).
  - `emotion`: `neutral | happy | sad | angry | surprised | relaxed`, for the beat.
  - `motions`: `[{ motion, at? }]`; `at` names words of the beat's text where the motion starts.
  - `hidden`: hide this speaker's avatar during the beat.

## Rendering

- One continuous track per avatar speaker for the whole video, not one clip per beat: per-beat
  clips would reset breathing, hair and blinking at every beat boundary.
- New action `avatar` (after `captions`, before `movie`). For each speaker with an avatar it builds a
  timeline from the beats that speaker narrates — the beat's audio file, its text in the audio
  language, start time `studioBeat.startAt + introPadding` (the same offset as captions), emotion
  and motions — and calls `compileTimeline()` and `render({ audio: false })` from `avatarscript`.
  Timing comes from forced alignment of the text to the audio, so every TTS provider works.
- Output: `<imageProjectDir>/avatar_<speaker>_<hash>.webm` (VP9 with alpha, avatar-sized), cached by
  a hash of everything that changes it; `-f` re-renders. Recorded in `studio.avatarTracks`
  (file, placement, hidden spans).
- `movie.ts`: after transitions (so slide transitions do not move the avatar), each track is
  overlaid: input with `-c:v libvpx-vp9` (needed to decode alpha), then
  `overlay=x:y:format=auto:eof_action=pass`, disabled during hidden beats.

## Dependencies

`avatarscript` and `onnxruntime-node` (forced alignment, ~290 MB) are loaded with a dynamic import
only when a script uses an avatar; without them the action fails with an install hint. They are
devDependencies here; whether to make them regular dependencies is left to the maintainers.

## Affected files

- `src/types/schema.ts`: `avatarPositionSchema`, `speakerAvatarSchema`, `mulmoAvatarParamsSchema`;
  `avatar` on speakers, `avatarParams` on beats and presentation style, `avatarTracks` on the studio.
- `src/methods/mulmo_presentation_style.ts`: `getSpeakerAvatar`.
- `src/actions/avatar.ts` (new), `src/actions/index.ts`, `src/cli/commands/movie/handler.ts`.
- `src/actions/movie.ts`: `addAvatars`.
- Tests: schema, track planning, filter graph. Sample: `scripts/test/test_avatar.json`.

## Later

- Direction markup inside `text` (stripped before TTS).
- Several avatars on screen in a dialogue (works per speaker already; layout presets).
- Viewer/bundle support; session-state progress for the `avatar` action.
