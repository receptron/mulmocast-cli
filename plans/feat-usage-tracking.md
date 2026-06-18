# Token / API usage tracking for billing API

## Goal

Wrap mulmocast as an API service that bills end users based on actual upstream AI consumption (tokens, predict-seconds, characters). To support that, the mulmocast layer must surface structured usage from every AI call.

## Non-goals

- Cost / pricing tables (maintained by the API / billing layer, not mulmocast).
- Persistence (DB, Stripe meter, etc.) — mulmocast returns usage in-memory; persistence is the caller's job.
- Multi-tenant attribution — `tenant_id` / `request_id` live in the API layer and are not stored in mulmocast.

## Design

```ts
// src/utils/usage_collector.ts
export type UsageRecord = {
  agent: string;           // "imageOpenaiAgent"
  provider: string;        // "openai" | "google" | "replicate" | "elevenlabs" | ...
  model: string;
  beatIndex?: number;
  // tokens (LLM, gpt-image-1, gemini-image, etc.)
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  // predict seconds (Replicate, Veo)
  predictSec?: number;
  // characters (TTS)
  inputChars?: number;
  cached: boolean;
  retryAttempt?: number;
  timestamp: string;
};

export class UsageCollector {
  add(record: UsageRecord): void;
  snapshot(): UsageRecord[];
}
```

- `MulmoStudioContext.usageCollector?: UsageCollector` — optional, per-request, never global.
- Each AI agent returns `{ ...payload, usage?: { provider, model, ...metrics } }`.
- Each action (`images()` / `audio()` / `movie()`) registers a GraphAI callback that pushes successful agent results into `context.usageCollector`.
- Public action functions return `{ context, usage }` (additive — existing callers ignoring it keep working).
- Cache hits never call the agent → automatically excluded from usage. If the billing layer wants to surface cache hits separately, add a parallel cache-hit counter (deferred).

## Per-agent state

See umbrella issue and audit table for the up-to-date matrix. Summary:

- **Straightforward (data is there, just extract)**: `image_openai_agent`, `image_genai_agent`, `@graphai/openai_agent`, `@graphai/gemini_agent`, `@graphai/anthropic_agent`.
- **SDK rework needed (replicate.run() drops metrics)**: `image_replicate_agent`, `movie_replicate_agent`, `sound_effect_replicate_agent`, `lipsync_replicate_agent` — switch to `predictions.create()` + poll or fall back to wall-clock.
- **No usage from upstream (must derive from input)**: TTS providers (openai / elevenlabs / google / kotodama). Research issue covers whether any of them expose per-call usage we missed.
- **Unclear (need to verify)**: `tts_gemini_agent` (likely has `usageMetadata`), `movie_genai_agent` Veo metadata, `@graphai/groq_agent`.

## Known integration gaps (research / verify before phase 1 lands)

1. Nested mapAgent callback propagation — verify `graph.registerCallback` reaches inner-graph nodes; if not, register via `graphOptions.callbacks` and write a unit test.
2. Retry double-count — `retry: 2` on `imageGenerator`. Record `retryAttempt` so the billing layer can decide. Most providers don't bill failed calls but partial successes (rate limits, context cutoffs) need care.
3. `src/tools/*` builds its own GraphAI graphs separately from `actions/`. Easy to forget. Phase 3 wires those up.
4. Dynamic `agent: ":preprocessor.imageAgentInfo.agent"` — callback can't read provider from the path string. We rely on the agent's return shape to carry `{ provider, model }`.

## Phased plan

Tracked via child issues under the umbrella:

- **Phase 1** — collector + StudioContext hook + first wave of agents (image_openai / image_genai) + GraphAI callback wiring + Phase-1 LLM coverage.
- **Phase 2** — Replicate predict_time across the 4 replicate agents + Veo movie usage.
- **Phase 3** — `src/tools/*` LLM wiring, nested callback verification, optional cache-hit counter.

## Verification

Per phase: `yarn build` + `yarn lint` + add `node:test` unit tests for `UsageCollector` and for nested callback propagation. End-to-end: run `cli movie scripts/test/test_no_audio.json`, assert `usage.json` has expected entries per beat (image agent only, no TTS since `text: ""`).
