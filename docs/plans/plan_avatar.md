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
    { "speaker": "Miko", "text": "…", "avatarParams": { "position": { "x": "18%", "scale": "48%" } } }
  ]
}
```

- `speakers.<name>.avatar` — `{ source, position? }`. `source` is an AvatarScript avatar package
  (a folder with `avatar.json`, or a mesh-avatar-studio project): a path relative to the script file,
  or an http(s) URL of the package folder or its `avatar.json`, for example
  `https://raw.githubusercontent.com/receptron/mulmocast-media/main/avatars/ani` (avatarscript ≥ 0.3.0
  fetches it and caches its images in `~/.cache/avatarscript/avatars/`).
  A `lang` override of the speaker keeps the base speaker's avatar unless it names its own.
- `avatarParams` — on the script (defaults) and on a beat (overrides):
  - `position`: `x` (horizontal centre, % of canvas width, default `84%`), `y` (bottom edge, % of
    canvas height, default `100%`), `scale` (height, % of canvas height, default `62%`). Set it for
    the whole script at the top level and override it per beat. Precedence: beat → speaker avatar →
    script → default. A beat's position holds for that beat; during another speaker's beat an
    avatar stays where it was.
  - `emotion`: `neutral | happy | sad | angry | surprised | relaxed`, for the beat.
  - `motions`: `[{ motion, at? }]`; `at` names words of the beat's text where the motion starts.
  - `hidden`: hide this speaker's avatar during the beat.

## Rendering

- One continuous track per avatar speaker for the whole video, not one clip per beat: per-beat
  clips would reset breathing, hair and blinking at every beat boundary. Several speakers with
  avatars give several tracks, all on screen; the ones not speaking idle.
- New action `avatar` (after `captions`, before `movie`). For each speaker with an avatar it builds a
  timeline from the beats that speaker narrates — the beat's audio file, its text in the audio
  language, start time `studioBeat.startAt + introPadding` (the same offset as captions), emotion
  and motions — and calls `compileTimeline()` and `render({ audio: false })` from `avatarscript`.
  Timing comes from forced alignment of the text to the audio, so every TTS provider works.
- Output: `<imageProjectDir>/avatar_<speaker>_<hash>.webm` (VP9 with alpha), rendered once at the
  largest size the avatar is shown, cached by a hash of everything that changes the picture — the
  segments, the size and modification time of each beat's audio and of every file in the avatar
  package (for an avatar at a URL: its JSON listings — `avatar.json`, `layers.json`, `sprites.json` —
  fetched on every run, which change when the avatar is rebuilt), the duration and the height; `-f`
  re-renders. Next to it, `avatar_<speaker>_<hash>.json`
  keeps the avatar's aspect ratio, so reusing a cached track needs neither `avatarscript` nor
  `onnxruntime-node`. Recorded in `studio.avatarTracks`: the file, its size, and its placements — absolute
  `[start, end)` stretches with a place and size each (none during hidden beats).
- The whole avatar image is shown (`padTop: 0`): a rig may crop the flat top edge of its image,
  which is hidden only when the avatar fills the frame; over a slide it would cut the head.
- `movie.ts`: after transitions (so slide transitions do not move the avatar), each track is
  read once with `-c:v libvpx-vp9` (needed to decode alpha) and `split` per placement. Each copy is
  trimmed to its stretch and kept at its time (`trim=start:end,setpts=PTS-STARTPTS+start/TB`), so
  scaling and overlaying run only during that stretch; then scaled to the placement's size and
  overlaid with `overlay=x:y:format=auto:eof_action=pass:enable='gte(t,start)*lt(t,end)'`.
- Captions: with avatar tracks, captions are overlaid last, over the avatar (the avatar stands at the
  bottom edge, where captions are). Without, the filter graph is unchanged.
- `movie` warns when a speaker has an avatar but `studio.avatarTracks` is not set, i.e. the
  `avatar` action did not run first. The CLI `movie` command and the MCP server's `movie` both run it.

## Dependencies

`avatarscript` and `onnxruntime-node` (forced alignment, ~290 MB) are optional peer dependencies:
users who want avatars install them (`npm install avatarscript onnxruntime-node`); everyone else
does not pay for them (`avatarscript` brings kuromoji and puppeteer). They are loaded with a dynamic
import only when a track has to be rendered; without them rendering fails with that install hint.
A cached track needs neither. `avatarscript` is also a devDependency here (types and tests).
`onnxruntime-node` is not: on Linux its install script downloads CUDA binaries from NuGet, which
timed out in CI and failed `yarn install`.

## Affected files

- `src/types/schema.ts`: `avatarPositionSchema`, `speakerAvatarSchema`, `mulmoAvatarParamsSchema`;
  `avatar` on speakers, `avatarParams` on beats and presentation style, `avatarTracks` on the studio.
- `src/methods/mulmo_presentation_style.ts`: `getSpeakerAvatar`.
- `src/actions/avatar.ts` (new), `src/actions/index.ts`, `src/cli/commands/movie/handler.ts`.
- `src/actions/movie.ts`: `addAvatars`, captions over avatars, missing-track warning.
- `src/mcp/server.ts`: runs `avatar` before `movie`.
- Tests: schema, track planning, filter graph. Sample: `scripts/test/test_avatar.json`.

## Later

- Direction markup inside `text` (stripped before TTS).
- Several avatars on screen in a dialogue (works per speaker already; layout presets).
- Viewer/bundle support; session-state progress for the `avatar` action.
