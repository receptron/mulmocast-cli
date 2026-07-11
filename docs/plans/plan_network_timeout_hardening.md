# Network Timeout Hardening Plan (silent-hang fix)

Issue: #1474
Supersedes / implements: `plan_fetch_error_handling.md`

## Problem

`movie` / `images` generation can hang **indefinitely with no error** during image
generation. Restarting completes it (cached beats skipped; the stalled beat succeeds
on a fresh connection).

Root cause: several network calls in the model/media agents have **no timeout**, so a
stalled socket yields a promise that neither resolves nor rejects. GraphAI's
`imageGenerator` node has `retry: 2` (`src/actions/images.ts`), but retry only fires on
**rejection** — a hang never rejects, so the `concurrency: 4` map waits forever.

## Principle

Bound every network wait so a stall becomes a **rejection** (which triggers the existing
`retry`). Do **not** change the normal success path. Use **generous, category-appropriate,
named** timeouts so legitimate long-running generation (esp. video) is never interrupted.

## Design

### 1. Shared helper — `src/utils/fetch.ts`

```ts
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

// Returns the Response; callers do their own .ok / .arrayBuffer() / .json().
// Converts an AbortController timeout into a rejected promise (never hangs).
export const safeFetch = async (url, init?, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response>
```

- AbortController + `setTimeout(abort)`, cleared in `finally`.
- On `AbortError` → throw `Fetch timeout after <ms>ms: <url>`.
- Merges caller `signal` is out of scope (no caller passes one today).

### 2. Replace all bare `fetch()` with `safeFetch`

| File | Purpose | Timeout const |
|------|---------|---------------|
| image_openai_agent.ts | DALL·E URL download | DOWNLOAD |
| image_replicate_agent.ts | image download | DOWNLOAD |
| movie_replicate_agent.ts | video download | MEDIA_DOWNLOAD |
| lipsync_replicate_agent.ts | video download | MEDIA_DOWNLOAD |
| sound_effect_replicate_agent.ts | audio/video download | MEDIA_DOWNLOAD |
| tts_elevenlabs_agent.ts | TTS API POST | API |
| tts_kotodama_agent.ts | TTS API POST | API |
| media_mock_agent.ts | mock movie download | DOWNLOAD |
| utils/file.ts | fetch remote MulmoScript | DEFAULT |
| methods/mulmo_media_source.ts | 4 sites: reference image, mermaid text, image-plugin, url→dataURL | DEFAULT |
| actions/pdf.ts | remote image for PDF | DOWNLOAD |
| actions/bundle.ts | BGM download | MEDIA_DOWNLOAD |

Error semantics preserved: each site keeps its existing `assert(response.ok, …, cause)` /
`throw new Error(…, { cause })`. `safeFetch` only replaces the raw `fetch` call.

### 3. Consolidate hand-rolled wrappers (DRY)

- `bg_image_util.ts` `fetchUrlAsDataUrl` → use `safeFetch`.
- `mulmo_media_source.ts` `urlToDataUrl` → use `safeFetch`.
  (Both already implement the same pattern with a local `DEFAULT_FETCH_TIMEOUT_MS`.)

### 4. SDK generation timeouts

- **OpenAI** (`src/utils/openai_client.ts`): add `timeout: OPENAI_REQUEST_TIMEOUT_MS`
  (keep SDK default `maxRetries: 2`). Covers `image_openai` + `tts_openai`. This is the
  direct fix for the reported `gpt-image-1` stall.
- **Google GenAI**: add `httpOptions: { timeout: GENAI_REQUEST_TIMEOUT_MS }` to every
  `new GoogleGenAI({...})` (`image_genai`, `tts_gemini`, `movie_genai`). Applies to each
  individual API call (kick-off + each poll), not the whole video job.
- **Replicate**: thread an `AbortSignal` (with timeout) into the existing
  `runReplicateWithMetrics(…, signal)` from all 4 replicate agents.
- **`pollUntilDone`** (`movie_genai_agent.ts`): add an overall wall-clock cap
  (`VIDEO_POLL_TIMEOUT_MS`); throw a labeled error if exceeded so it can't loop forever.

### 5. Timeout constants (generous safety nets, not tight deadlines)

| Const | Value | Rationale |
|-------|-------|-----------|
| DEFAULT_FETCH_TIMEOUT_MS | 30 s | small assets (ref/bg images, JSON) — matches existing |
| FETCH_DOWNLOAD_TIMEOUT_MS | 60 s | generated image download |
| FETCH_MEDIA_DOWNLOAD_TIMEOUT_MS | 180 s | large video/audio download |
| FETCH_API_TIMEOUT_MS | 120 s | TTS text→audio POST |
| OPENAI_REQUEST_TIMEOUT_MS | 120 s | gpt-image-1 typ. <60 s; ×(1+2 retries) ceiling |
| GENAI_REQUEST_TIMEOUT_MS | 120 s | per API call (not the whole video job) |
| REPLICATE_RUN_TIMEOUT_MS | 600 s | seedance/kling video jobs run minutes |
| VIDEO_POLL_TIMEOUT_MS | 1200 s | Veo long-running op wall-clock cap |

All values are named constants (no magic numbers) and easy to tune in review.

## PR breakdown (shipped as independent, file-disjoint PRs for review)

To keep each PR small and independently reviewable/revertable, the work is split
so no two PRs touch the same file. The SDK-timeout constants are defined locally
in the file that uses them (rather than one shared module) so every PR is
independent of the others and of `main`:

| PR | Meaning | Files |
|----|---------|-------|
| A | fetch layer: `safeFetch` + route all bare `fetch()` through it + consolidate hand-rolled wrappers + tests | `utils/fetch.ts`, `test/utils/test_fetch.ts`, all fetch call sites, this plan |
| B | OpenAI client request timeout (direct fix for the reported `gpt-image-1` stall) | `utils/openai_client.ts` |
| C1 | Replicate `run()` timeout (+ compose caller signal) | `utils/replicate_usage.ts` |
| C2 | GenAI image request timeout | `agents/image_genai_agent.ts` |
| C3 | GenAI TTS request timeout | `agents/tts_gemini_agent.ts` |
| C4 | GenAI video request timeout + poll wall-clock cap + error-detail preservation | `agents/movie_genai_agent.ts` |

## Out of scope
- Puppeteer `protocolTimeout` (#1366) — rendering-side, separate.

## Tests
- Unit test `safeFetch`: resolves on fast response; rejects with timeout error when the
  server never responds (mock `fetch` / slow local handler); passes through non-timeout
  errors. No network/API keys required.

## Gates
`yarn format` → `yarn lint` → `yarn build` → `yarn typecheck` (if present) → `yarn ci_test`.
