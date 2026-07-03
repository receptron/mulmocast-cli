# Plan: Pre-run usage estimator for MulmoScript

Issue: https://github.com/receptron/mulmocast-cli/issues/1465

## Goal

`estimateUsage(script, options?)` — a pure function that walks a MulmoScript and returns, per beat and per process, the API usage a full generation run would consume (tokens / characters / billed seconds), before running anything. Each metric carries a precision flag (`exact` vs `estimated`).

## Schema design

### 1. Pricing metadata in `src/types/provider2agent.ts`

Generalize the existing `price_per_sec` (currently on replicate movie models only, no runtime readers) into a pricing structure usable by all providers. Prices change over time, so every entry records when it was last verified:

```typescript
export type ModelPricing = {
  unit: "tokens" | "chars" | "seconds" | "images";
  inputPerMTokensUSD?: number;
  outputPerMTokensUSD?: number;
  perMCharsUSD?: number;
  perSecUSD?: number;
  perImageUSD?: number;
  asOf: string; // YYYY-MM-DD, date the price was last verified against the provider's pricing page
};
```

- A separate `modelPricing: Record<provider, Record<model, ModelPricing>>` map plus a `getModelPricing(provider, model)` helper (the existing tables keep their published shapes; per-entry pricing would have required restructuring them).
- Keep `price_per_sec` untouched (published via `@mulmocast/types`; external consumers may read it). The replicate movie / lipSync pricing entries are **generated** from `price_per_sec` so there is a single source of truth.
- Populate pricing for default/common models from official pricing pages (all values verified 2026-07-03); missing pricing simply yields no `costUSD`.
- Also export `gptImageOutputTokens` (the fixed size × quality output-token table for gpt-image-1 / gpt-image-1-mini).

### 2. Estimate result types in `src/types/usage.ts`

Mirrors `UsageRecord` vocabulary so estimates can be compared with actuals collected by `usage_callback.ts`:

```typescript
export type EstimatePrecision = "exact" | "estimated";
export type EstimatedMetric = { value: number; precision: EstimatePrecision };

export type UsageEstimate = {
  process: "tts" | "image" | "htmlImage" | "movie" | "soundEffect" | "lipSync" | "translate" | "imageReference" | "movieReference";
  beatIndex?: number; // undefined for script-level imageParams.images references
  refKey?: string; // reference image key for imageReference / movieReference
  lang?: string; // tts / translate target language
  provider: string;
  model: string;
  inputTokens?: EstimatedMetric;
  outputTokens?: EstimatedMetric;
  inputChars?: EstimatedMetric;
  predictSec?: EstimatedMetric;
  imageCount?: EstimatedMetric;
  costUSD?: number; // present only when pricing data exists; inherently an estimate (prices drift)
  pricingAsOf?: string;
};
```

## Estimator: `src/utils/estimate_usage.ts` (new, browser-compatible)

Signature:

```typescript
estimateUsage(script: MulmoScript, options?: {
  lang?: string;           // audio language (default: script default lang)
  targetLangs?: string[];  // translate targets (default: derived like translate action)
  presentationStyle?: MulmoPresentationStyle; // default: the script itself
}): UsageEstimate[];
```

Provider/model resolution reuses the same Methods the actions use: `getSpeaker`, `getImageAgentInfo`, `getMovieAgentInfo`, `getHtmlImageAgentInfo`, `getSoundEffectAgentInfo`, `getLipSyncAgentInfo`, `getModelDuration`, and the prompt builders `imagePrompt()`, `getHtmlPrompt()`, `htmlImageSystemPrompt()`, `translateSystemPrompt` / `translatePrompts`.

Tokenizer: add `js-tiktoken` (pure JS/TS — no WASM, no Node built-ins, so it runs in browsers too; already a transitive dep). Use `js-tiktoken/lite` + explicit `o200k_base` ranks import so only one encoding is bundled. OpenAI models → exact token counts. Gemini / Claude → char-based heuristic, flagged `estimated`.

Browser compatibility: the estimator uses no Node built-ins (its dependencies — `MulmoPresentationStyleMethods`, `prompt.ts`, `provider2agent.ts` — are all browser-safe), so it is exported from `index.common.ts` and works in both Node and browsers. Caveat: the o200k_base rank data adds ~2 MB to browser bundles that import it.

### Per-pipeline rules (mirroring the real gating in actions)

| process | gate (beat) | metrics and precision |
|---|---|---|
| tts | skip if `beat.audio`, empty `text`, or `suppressSpeech` | char-billed providers (openai char models / google / elevenlabs / kotodama): `inputChars` = text length → exact. Token-billed (`gpt-4o-mini-tts`): tiktoken → exact. gemini: wrapper prompt (Director's Notes) + char heuristic → estimated |
| image | `imagePrompt` present, or no `beat.image` and not movie-only (mirror `imagePreprocessAgent`) | prompt = `imagePrompt(beat, style)`. openai gpt-image-1: `inputTokens` tiktoken → exact, `outputTokens` fixed by size/quality table → exact. google: heuristic → estimated. replicate: `imageCount` = 1 → exact |
| htmlImage | `beat.htmlPrompt` | `inputTokens` = system + user prompt (openai: tiktoken → exact; anthropic: heuristic). `outputTokens`: heuristic (HTML output length is unknowable) → estimated |
| movie | `beat.moviePrompt` | `predictSec` = `beat.duration` snapped via `getModelDuration` → exact when `duration` set; otherwise estimated from text speech duration heuristic (chars/sec) → estimated |
| soundEffect | `soundEffectPrompt` && isMovie | `predictSec` = beat duration (same precision rule as movie) |
| lipSync | `enableLipSync` | `predictSec` = beat duration (same precision rule) |
| translate | per beat × targetLang; skip same-lang and empty text | `inputTokens` = system + prompts + text via tiktoken (gpt-4o) → exact; `outputTokens` ≈ text tokens × language factor → estimated |
| imageReference / movieReference | `imageParams.images` and `beat.images` entries of type `imagePrompt` / `moviePrompt` | one generation call each, same rules as image / movie |

Non-billable (no records): all local image plugins (textSlide, markdown, chart, mermaid, html_tailwind, slide, image, movie, source, vision, voice_over, beat) and captions.

### Cost

When pricing is known for provider+model, emit `costUSD` (always flagged `estimated` — prices drift) and `pricingAsOf`.

## Files

- `src/types/provider2agent.ts` — `ModelPricing` type + pricing data with `asOf`
- `src/types/usage.ts` — `EstimatePrecision`, `EstimatedMetric`, `UsageEstimate`
- `src/utils/estimate_usage.ts` — new estimator (browser-compatible)
- `src/index.common.ts` — export `estimateUsage` (available in both Node and browser entries)
- `test/test_estimate_usage.ts` — new tests
- `package.json` — add `js-tiktoken`

## Implementation steps

1. Add `ModelPricing` type and pricing data (researched from official pricing pages, dated `asOf`)
2. Add estimate types to `usage.ts`
3. Implement estimator pipeline by pipeline (tts → image → htmlImage → movie → soundEffect/lipSync → translate → references)
4. Tests (node:test, pure function, no API keys): happy path, gating rules (beat.audio / suppressSpeech / same-lang / movie-only), precision flags, unknown model → no costUSD, empty/edge cases
5. `yarn format` / `yarn lint` / `yarn build` / `yarn ci_test`
6. README: short API section for `estimateUsage`

## Out of scope (future)

- Cache-aware estimation (checking existing output files / force flag)
- CLI subcommand (`mulmo estimate`) — function only for now
- Note: `src/types/` changes ⇒ `@mulmocast/types` release needed when merged
