# Gemini API video: gemini-omni-1.1-flash (#1616)

## Why

The Gemini API video default `veo-3.1-generate-preview` and `veo-3.1-lite-generate-preview` shut down on 2026-10-22. Google's successor `gemini-omni-1.1-flash` is called through the Interactions API (`ai.interactions.create`), not `generateVideos`.

## Decisions (user, 2026-10-07)

- The Gemini API default becomes `gemini-omni-1.1-flash`. Vertex AI keeps `veo-3.1-generate-001`.
- Beats longer than one segment are made by extending the video (as the Veo preview did), up to the model's 40-second total.
- `veo-3.1-generate-preview` and `veo-3.1-lite-generate-preview` are removed now.

## What real calls established

- Request: `{ model, input, response_format: { type: "video", aspect_ratio, resolution, duration: "<N>s" } }`. `input` is the prompt text, or `[{ type: "image", data, mime_type }, …, { type: "text", text }]` for a first frame (and a last frame as a second image).
- `duration` is a string of whole seconds, 3 to 10 (`"2s"` and `"12s"` are rejected with the bounds; `"8"` is rejected as invalid).
- `aspect_ratio` is only `16:9` or `9:16`.
- The response is synchronous. `output_video.data` is base64 MP4 with audio (always generated). 10s at 720p came back inline (6.7 MB).
- Extension: a second call with `previous_interaction_id` and `duration` returns the whole video (3s + 5s gave 8.0s), billed for the new seconds only.
- Billing: video output tokens at $17.50 / 1M, about 5,800 tokens per second at 720p (≈ $0.10 / s).

## Changes

- `src/utils/gemini_omni_video.ts` (pure): segment plan for a requested length, aspect ratio, request builders.
- `src/agents/movie_genai_agent.ts`: an Interactions path for `gemini-omni-*`, with an injectable client so the call sequence is unit-tested. The Veo extension path is removed with the preview model. Vertex AI + omni is an explicit error (untested there).
- `src/types/provider2agent.ts`: model list, default, model params, pricing.
- `src/utils/estimate_usage.ts`: the omni extension total replaces the Veo one.
- Tests, docs, sample scripts that named the removed models.
