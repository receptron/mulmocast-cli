# mulmocast — Programmatic API reference

Two ways to consume mulmocast from another project:

1. **As a CLI** — spawn the `mulmo` binary from `node_modules/.bin/mulmo`. Simple, language-agnostic. See `../mulmo-demo/server/mulmo/runner.ts` for a reference implementation that drives generation via `spawn`.
2. **As a library** — import directly from the published `mulmocast` package. Lets you drive the per-beat pipeline, pass progress callbacks, supply API keys at runtime, and collect token / billing usage. See `../mulmocast-app/src/main/mulmo/` for a reference (Electron app driving mulmocast in-process).

This doc covers the library path.

## Install

```bash
yarn add mulmocast
# Plus the system deps the underlying agents need:
#   - ffmpeg (audio / video)
#   - chromium (puppeteer; auto-installed by `npx puppeteer browsers install chrome`)
```

Node 22+ required. The package is ESM-only (`"type": "module"`).

## Public API surface

What `import { … } from "mulmocast"` gives you, by area:

| Area | Exports |
|---|---|
| Context / scripts | `getFileObject`, `initializeContextFromFiles`, `MulmoStudioContext`, `MulmoStudioContextMethods`, `MulmoScript`, `mulmoScriptSchema`, `MulmoScriptMethods` |
| Actions (full-pipeline) | `images`, `audio`, `movie`, `pdf`, `captions`, `translate`, `bundle`, `markdown`, `html`, `mulmoViewerBundle` |
| Per-beat (granular) | `generateBeatImage`, `generateBeatAudio`, `generateReferenceImage`, `getBeatAudioPathOrUrl`, `translateBeat` |
| Settings & i18n | `settings2GraphAIConfig` (via `args.settings`), `setMulmoErrorFormatter`, `bundleTargetLang` |
| Progress callbacks | `addSessionProgressCallback`, `removeSessionProgressCallback` |
| Logging | `setGraphAILogger` |
| Path helpers | `getOutputStudioFilePath`, `getOutputMultilingualFilePath`, `getOutputVideoFilePath`, `getOutputPdfFilePath`, `getReferenceImagePath`, `getBeatPngImagePath`, `getCaptionImagePath`, `getBeatMoviePaths` |
| Usage tracking | `UsageCollector`, `UsageRecord`, `UsageCollectorAPI`, `AgentUsage` (see [Usage tracking](#usage-tracking) below) |
| Usage estimation | `estimateUsage`, `UsageEstimate`, `EstimatedMetric`, `modelPricing`, `ModelPricing` (see [Pre-run estimation](#pre-run-estimation-estimateusage) below) |
| Agents (direct use) | `puppeteerCrawlerAgent`, `validateSchemaAgent`, all `image*Agent` / `tts*Agent` / `movie*Agent` / `lipsync*Agent` agents |

## Lifecycle: from MulmoScript JSON to rendered video

```ts
import {
  getFileObject,
  initializeContextFromFiles,
  audio,
  images,
  captions,
  movie,
  setGraphAILogger,
  UsageCollector,
} from "mulmocast";

setGraphAILogger(false); // suppress noisy debug logs from GraphAI

const files = getFileObject({
  basedir: "/path/to/project",
  outdir: "/path/to/project/output",
  file: "script.json", // MulmoScript JSON in basedir
});

const context = await initializeContextFromFiles(
  files,
  /* raiseError */ true,
  /* force      */ false,
  /* withBackup */ true,
  /* captionLang */ undefined,
  /* targetLang  */ undefined, // set e.g. "ja" to translate to Japanese
  /* beatIndex   */ undefined, // limit to a single beat for re-renders
);
if (!context) throw new Error("Context init failed");

// Attach a UsageCollector if you want billing-grade token counts back:
context.usageCollector = new UsageCollector();

// Run the pipeline. Same chain as the `mulmo movie` CLI command.
await audio(context).then(images).then(captions).then(movie);

// After completion you can read usage:
const usage = context.usageCollector!.snapshot();
console.log(usage); // UsageRecord[]
```

## Actions

All actions take `(context, args?)` and mutate `context.studio` in place. The optional `args.settings` lets you pass per-call API keys instead of relying on `process.env`.

| Action | Purpose | Required dependencies |
|---|---|---|
| `audio(context, args?)` | TTS per beat → combined mp3 | TTS provider key (`OPENAI_API_KEY` etc.) |
| `images(context, args?)` | Generate per-beat images (and html/movie media) | Image provider key |
| `captions(context, args?)` | Render caption overlays for the video | none (ffmpeg only) |
| `movie(context, args?)` | Combine audio + images + captions into mp4 | ffmpeg |
| `pdf(context, mode, size, args?)` | Render PDF (`slide`/`talk`/`handout` × `a4`/`letter`/…) | puppeteer |
| `translate(context, args?)` | LLM-translate beat text into `args.targetLangs` (default: context.lang + captionParams.lang) | LLM key |
| `bundle(context, args?)` | Translate + render + zip up `<filename>_viewer.html` + assets | All of the above |
| `markdown(context, imageWidth?)` | Emit a Markdown rendering | image keys (if not cached) |
| `html(context, imageWidth?)` | Emit a standalone HTML rendering | image keys (if not cached) |
| `mulmoViewerBundle(context)` | Zip the bundle artifact (no AI; runs after bundle) | none |

### Args shape

```ts
type PublicAPIArgs = {
  settings?: Record<string, string>;   // API keys keyed by env-var name
  callbacks?: CallbackFunction[];      // GraphAI per-node callbacks (passed to every GraphAI in the action)
};
```

`settings` keys are merged into the GraphAI agent config (see [Settings & API keys](#settings--api-keys)).

## Per-beat APIs

Useful when you want to re-render a single beat after the user edits the script:

```ts
import { generateBeatImage, generateBeatAudio, translateBeat } from "mulmocast";

// Re-generate image for beat 3 (force-bypassing cache)
await generateBeatImage({
  index: 3,
  context,
  args: { forceImage: true, callbacks: [] },
});

// Re-generate audio for beat 3
await generateBeatAudio({ index: 3, context, args: {} });

// Translate beat 3 to Japanese
await translateBeat(3, context, ["ja"]);
```

`generateReferenceImage` / `generateReferenceMovie` are for the `presentationStyle.imageParams.images` reference catalog (character / asset images reused across beats).

## Settings & API keys

Two equivalent options:

**Option A: process.env** (matches the CLI's `.env` file convention)

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
ANTHROPIC_API_TOKEN=sk-ant-...
REPLICATE_API_TOKEN=r8_...
ELEVENLABS_API_KEY=...
KOTODAMA_API_KEY=...
BROWSERLESS_API_TOKEN=...
```

**Option B: pass `args.settings`** at every action call (lets multi-tenant servers attach per-request credentials):

```ts
const settings = {
  OPENAI_API_KEY: "sk-...",
  GEMINI_API_KEY: "AIzaSy...",
};
await audio(context, { settings });
await images(context, { settings });
```

### Azure OpenAI

For Azure-hosted OpenAI use service-prefixed keys (see `../mulmocast-app/src/main/mulmo/handler_generator.ts` for a working example):

```ts
const settings = {
  IMAGE_OPENAI_API_KEY: azureKey,
  IMAGE_OPENAI_BASE_URL: "https://my-resource.openai.azure.com/",
  TTS_OPENAI_API_KEY: azureKey,
  TTS_OPENAI_BASE_URL: "https://my-resource.openai.azure.com/",
  LLM_OPENAI_API_KEY: azureKey,
  LLM_OPENAI_BASE_URL: "https://my-resource.openai.azure.com/",
  LLM_OPENAI_API_VERSION: "2025-04-01-preview",
};
```

### Vertex AI (Google)

For Vertex-hosted Veo/Imagen/Gemini, set `vertexai_project` in MulmoScript's `imageParams` / `movieParams` and authenticate via Google ADC (`gcloud auth application-default login`). See [`docs/vertexai_en.md`](./vertexai_en.md).

## Progress callbacks

Mulmocast exposes a session-level callback (separate from GraphAI node callbacks):

```ts
import { addSessionProgressCallback, removeSessionProgressCallback } from "mulmocast";

const cb = (data: unknown) => {
  // data is { sessionType, index, id, in } per beat state transition
  myUi.send("progress-update", data);
};
addSessionProgressCallback(cb);
try {
  await audio(context).then(images).then(captions).then(movie);
} finally {
  removeSessionProgressCallback(cb);
}
```

For GraphAI-level node callbacks (e.g. node started / completed), pass `args.callbacks: CallbackFunction[]` to the action.

## Usage tracking

The `usageCollector` slot on `MulmoStudioContext` is the **only** place mulmocast surfaces token / per-second / per-char usage. The API/billing layer reads it; mulmocast does not maintain a rate table.

### Setup

```ts
import { UsageCollector } from "mulmocast";

context.usageCollector = new UsageCollector();
await audio(context).then(images).then(captions).then(movie);
const records = context.usageCollector.snapshot();
```

A `UsageCollector` is automatically created inside `initializeContextFromFiles` — you only need to construct one manually if you bypass that helper.

### `UsageRecord` shape

```ts
type UsageRecord = {
  agent: string;          // "imageOpenaiAgent" | "ttsGeminiAgent" | "openAIAgent" | …
  provider: string;       // "openai" | "google" | "replicate" | "elevenlabs" | "kotodama" | "gemini" | "anthropic" | "groq"
  model: string;          // resolved model name as actually used
  beatIndex?: number;     // from the mapAgent that dispatched the call
  inputTokens?: number;   // LLM / token-billed image / Gemini TTS
  outputTokens?: number;
  totalTokens?: number;
  predictSec?: number;    // Replicate (metrics.predict_time) and Veo (ffprobed mp4)
  inputChars?: number;    // char-billed TTS (openai legacy / google / kotodama / elevenlabs)
  cached: boolean;        // always false in practice — cache hits don't fire the callback at all
  retryAttempt?: number;  // from log.retryCount
  timestamp: string;      // ISO-8601
};
```

### `AgentUsage` shape (agent-side contract)

Each AI agent returns this minimal shape; the GraphAI callback enriches it into a `UsageRecord` before pushing to the collector.

```ts
type AgentUsage = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  predictSec?: number;
  inputChars?: number;
};
```

### What each agent populates

| Agent | Provider | Model(s) | inputTokens | outputTokens | totalTokens | predictSec | inputChars |
|---|---|---|---|---|---|---|---|
| `imageOpenaiAgent` | openai | `gpt-image-1`, `gpt-image-1-mini`, … | ✅ | ✅ | ✅ | — | — |
| `imageGenAIAgent` | google | `gemini-2.5-flash-image`, `gemini-3.x-image-preview` | ✅ | ✅ | ✅ | — | — |
| `imageReplicateAgent` | replicate | `black-forest-labs/flux-*`, `ideogram-ai/*`, `recraft-ai/*`, … | — | — | — | ✅ | — |
| `movieGenAIAgent` | google | `veo-3.1-*` | — | — | — | ✅ (ffprobed mp4) | — |
| `movieReplicateAgent` | replicate | `kwaivgi/kling-*`, `bytedance/seedance-*`, … | — | — | — | ✅ | — |
| `soundEffectReplicateAgent` | replicate | mmaudio etc. | — | — | — | ✅ | — |
| `lipSyncReplicateAgent` | replicate | sync-* | — | — | — | ✅ | — |
| `ttsOpenaiAgent` (tts-1, tts-1-hd) | openai | `tts-1`, `tts-1-hd` | — | — | — | — | ✅ |
| `ttsOpenaiAgent` (gpt-4o-mini-tts) | openai | `gpt-4o-mini-tts` | — | — | — | — | ✅ (token billing — see [Known gaps](#known-gaps)) |
| `ttsGoogleAgent` | google | voice tier name | — | — | — | — | ✅ |
| `ttsKotodamaAgent` | kotodama | speaker_id | — | — | — | — | ✅ |
| `ttsElevenlabsAgent` | elevenlabs | `eleven_*` | — | — | — | — | ✅ (`character-cost` HTTP header, already post-discount) |
| `ttsGeminiAgent` | gemini | `gemini-2.5-flash-preview-tts` | ✅ | ✅ | ✅ | — | — |
| `openAIAgent` (`@graphai/openai_agent`) | openai | `gpt-4o-*`, etc. | ✅ | ✅ | ✅ | — | — |
| `geminiAgent` (`@graphai/gemini_agent`) | google | `gemini-*` | ✅ | ✅ | ✅ | — | — |
| `anthropicAgent` (`@graphai/anthropic_agent`) | anthropic | `claude-*` | ✅ | ✅ | ✅ | — | — |
| `groqAgent` (`@graphai/groq_agent`) | groq | (Groq-hosted) | ✅ | ✅ | ✅ | — | — |

### CLI dump (no code change required)

For local verification of any CLI command:

```bash
# stdout (pipeable into jq)
MULMOCAST_DUMP_USAGE=1 yarn cli audio scripts/test/test_all_tts.json

# write to a file
MULMOCAST_DUMP_USAGE=/tmp/usage.json yarn cli movie scripts/test/test_veo31_lite.json
```

Payload shape:

```json
{
  "records": 5,
  "byModel": [
    { "provider": "openai",   "model": "gpt-4o-mini-tts", "records": 1, "inputChars": 20, "inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "predictSec": 0 },
    { "provider": "gemini",   "model": "gemini-2.5-flash-preview-tts", "records": 1, "inputTokens": 9, "outputTokens": 59, "totalTokens": 68, "inputChars": 0, "predictSec": 0 }
  ],
  "snapshot": [ /* raw UsageRecord[] */ ]
}
```

`byModel` groups by `provider:model` because different models have different rate cards. The raw `snapshot` is included so the billing layer can apply its own grouping.

### Programmatic dump

```ts
import { UsageCollector } from "mulmocast";

const collector = new UsageCollector();
context.usageCollector = collector;

await audio(context).then(images).then(captions).then(movie);

const records = collector.snapshot();        // UsageRecord[]
// Send to your billing layer:
await fetch("https://billing/ingest", {
  method: "POST",
  body: JSON.stringify({ tenant: "...", records }),
});
```

The collector also supports `collector.merge(other)` (e.g. accumulate per-action and then merge) and `collector.clear()` / `collector.size`.

### Cache hits

Mulmocast caches generated media on disk. When a beat is re-run and the artifact is on disk, the agent function is **not invoked**, so no `UsageRecord` is appended. This is the correct billing behavior (the upstream API wasn't called). If you need to see "cache hit" events separately, count files in `context.fileDirs.outDirPath` yourself before/after — usage tracking deliberately stays out of cache accounting.

### Known gaps

- **gpt-4o-mini-tts** is token-billed (text input + audio output) but OpenAI does not expose per-call token usage in the response or headers (probed and documented in PR #1439 / issue #1428). `inputChars: text.length` is the only signal mulmocast surfaces at runtime; [`estimateUsage`](#pre-run-estimation-estimateusage) fills the gap with tokenized input (`o200k_base`) and audio tokens ≈ 50/s.
- **Tavily search** (used only by `deepResearch`, not by the regular generation flow) is per-request billed and not surfaced. Out of scope (closed via #1446).
- **Whisper transcription** (only by `mulmo tool whisper`) is per-minute billed and not surfaced. Out of scope (closed via #1445).
- **Standalone CLI tools** (`mulmo tool scripting`, `mulmo tool whisper`, `mulmo tool sound_effect`) do not initialize a `MulmoStudioContext`. They are not part of the billed API surface.

### Pre-run estimation (`estimateUsage`)

```ts
import { estimateUsage } from "mulmocast";

const estimates = estimateUsage(script, { langs: ["en"], targetLangs: ["ja"] });
```

Walks the script without calling any API and returns `UsageEstimate[]` — one record per beat per process (`tts`, `image`, `htmlImage`, `movie`, `soundEffect`, `lipSync`, `translate`, `imageReference`, `movieReference`). Field names mirror `UsageRecord`, so estimates can be compared with runtime actuals per `provider:model`.

Every metric is an `EstimatedMetric` — `{ value, precision: "exact" | "estimated" }`:

- `exact`: deterministic from the script — TTS character counts, tokenized OpenAI prompts (`o200k_base` via js-tiktoken), the fixed gpt-image output-token table, explicit beat durations snapped to model-supported values.
- `estimated`: heuristic — LLM output length, speech duration derived from text, char-based token counts for non-OpenAI tokenizers, TTS input for languages whose translation doesn't exist yet.

`costUSD` (+ `pricingAsOf`) is attached when pricing is known. Prices live in `modelPricing` in `src/types/provider2agent.ts`; each entry records the date it was last verified against the provider's pricing page (`asOf`) because rates drift. Supporting a new model is a data change there, not a code change.

Options: `langs` (audio languages), `targetLangs` (translate targets; defaults to `langs` + `captionParams.lang` minus the script language), `presentationStyle` (overrides the script's own style, like the CLI `--presentation-style` flag).

Caveats: assumes a fresh run (no cache hits — see [Cache hits](#cache-hits)); mock providers are skipped; `zsxkib/mmaudio` (sound effects) gets no `costUSD` because it bills by GPU time rather than clip duration. The function is pure and browser-compatible, but bundling it pulls in the ~2 MB `o200k_base` rank table.

### Probes (for verifying new agents)

- `scripts/probe/probe_usage.ts` — env-driven E2E probe. `USAGE_ACTION=images|audio|translate|movie`, `USAGE_SCRIPT=path/to/script.json`, `USAGE_OUTDIR=/tmp/…`. Dumps `byModel` + raw snapshot.
- `scripts/probe/probe_openai_tts_headers.ts` — header-dump probe for OpenAI TTS endpoints (#1428 research script).

Both run with real API keys against real endpoints, so be aware of cost.

## Logging

```ts
import { setGraphAILogger, setMulmoErrorFormatter } from "mulmocast";

setGraphAILogger(verbose, /* optional logged values */ { foo: "bar" });

// Optional: rewrite error messages (e.g. for i18n in the host UI)
setMulmoErrorFormatter((err) => myI18n(err));
```

## Reference implementations

- `../mulmocast-app/src/main/mulmo/` — Electron app driving mulmocast in-process. Handles per-project contexts, multi-action flows, settings passing, Azure OpenAI keys. The closest match to a programmatic consumer.
- `../mulmo-demo/server/mulmo/runner.ts` — minimalist HTTP server that spawns the `mulmo` CLI as a child process. Good template if you don't need per-call control over context/state.

## See also

- [plans/feat-usage-tracking.md](../plans/feat-usage-tracking.md) — design notes for the usage tracking work
- [docs/tts.md](./tts.md) — how to add a new TTS provider
- [docs/vertexai_en.md](./vertexai_en.md) / [docs/vertexai_ja.md](./vertexai_ja.md) — Google Vertex AI setup
- [docs/image.md](./image.md) — image plugin / htmlPrompt configuration
- [docs/Workflow.md](./Workflow.md) — overall processing flow diagram
