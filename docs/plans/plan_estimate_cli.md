# Plan: `--estimate` CLI flag with action-scoped usage estimation

Issue: https://github.com/receptron/mulmocast-cli/issues/1467 (follow-up to #1465 / PR #1466)

## Goal

Expose `estimateUsage` from the CLI. The data consumed differs per action (`mulmo audio` bills TTS, `mulmo images` bills image/movie generation, …), so the estimate must be scoped to the action being run — in the library API as well.

## API changes (`src/utils/estimate_usage.ts`)

- Add `processes?: UsageEstimateProcess[]` to `EstimateUsageOptions`; when set, only matching records are returned.
- Export the action → processes mapping the CLI uses:

```typescript
export const actionEstimateProcesses = {
  audio: ["tts", "translate"],
  images: ["image", "htmlImage", "movie", "soundEffect", "lipSync", "imageReference", "movieReference", "translate"],
  pdf: [...same as images],
  movie: [...audio + images],
  translate: ["translate"],
} satisfies Record<string, UsageEstimateProcess[]>;
```

`translate` is included in every generation scope because the CLI handlers call `runTranslateIfNeeded` before generating; the estimator naturally emits zero translate records when no target language differs from the script language.

## Formatter (`src/utils/estimate_usage_format.ts`, new, browser-safe)

`formatUsageEstimates(records): string` — table grouped by `process` × `provider:model` with summed metrics, `~` prefix on values whose precision is `estimated`, and a final `total cost` line (`≈ $X.XXXX`, note on missing pricing / `pricingAsOf`). Pure function so it is unit-testable and reusable by the app.

## CLI changes

- `src/cli/common.ts`: `estimateOptions(yargs)` helper adding `--estimate` (boolean: "Estimate API usage and exit without generating") and `--json` (boolean: "With --estimate, print raw JSON records").
- Builders of `audio`, `image`, `movie`, `pdf`, `translate`: chain `estimateOptions`.
- Handlers: right after `initializeContext` (read-only, safe), when `argv.estimate`:

```typescript
if (argv.estimate) {
  printUsageEstimate(context, "audio", argv.json);
  return; // no generation, no translate, no usage dump
}
```

- `src/cli/helpers.ts`: `printUsageEstimate(context, action, asJson)` — runs `estimateUsage(context.studio.script, { presentationStyle: context.presentationStyle, langs: context.lang ? [context.lang] : undefined, processes: actionEstimateProcesses[action] })` and prints via `GraphAILogger.info` (same channel as `dumpUsageIfRequested`).

Language/style resolution therefore matches the real run: `-l`, `-p`, and `captionParams.lang` flow through the same context initialization.

## Tests (`test/utils/test_estimate_usage_cli.ts`)

- `processes` filter returns only matching records; empty filter returns nothing; undefined returns all.
- `actionEstimateProcesses` scoping: an audio estimate for a script with images contains no image records; translate scope only translate.
- Formatter: table contains grouped rows, `~` markers for estimated values, and the total line; JSON path is raw records.

## Docs

- README: `--estimate` example under the usage-estimation section.
- docs/api.md: `processes` option + `actionEstimateProcesses` in the Pre-run estimation section.

## Out of scope

- `types/` package release (no `src/types` changes planned here — the process union already lives there).
