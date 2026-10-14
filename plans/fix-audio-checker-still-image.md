# Skip the audio probe for still images (#1645)

`audioChecker` probed `movieFile || imageFile` with ffprobe, so image-only renders required ffmpeg.

- `src/utils/audio_probe_source.ts`: pure `audioProbeSource` — the movie file if any; otherwise the image-slot file
  only when it is not a still image (png / jpg / jpeg / gif / webp / bmp / svg, query and fragment ignored).
- `audioChecker` uses it. A beat with nothing to probe reports `hasMovieAudio: false`, as before.
- Verify: `mulmo images` with ffmpeg removed from PATH succeeds for textSlide / markdown / html_tailwind / chart /
  mermaid; `hasMovieAudio` for movie beats (with and without audio) is unchanged with ffmpeg present.
