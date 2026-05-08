# Plan: Remove deprecated Google Imagen 3 / Imagen 4 image models

## Background

Google has deprecated all Imagen 3 and Imagen 4 image generation models on the Gemini API / Vertex AI. Per the official deprecation page (https://ai.google.dev/gemini-api/docs/deprecations#imagen-models):

| Model | Shutdown date | Status (as of 2026-05-08) |
|---|---|---|
| `imagen-3.0-generate-002` | 2025-11-10 | already shut down |
| `imagen-4.0-generate-preview-06-06` | 2026-02-17 | already shut down |
| `imagen-4.0-ultra-generate-preview-06-06` | 2026-02-17 | already shut down |
| `imagen-4.0-generate-001` | 2026-06-24 | grace period (~6 weeks) |
| `imagen-4.0-ultra-generate-001` | 2026-06-24 | grace period |
| `imagen-4.0-fast-generate-001` | 2026-06-24 | grace period |

Recommended replacement (per Google): `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`. Both are already supported in mulmocast.

This PR follows the same pattern as PR #1367 (DALL-E 2/3 removal): remove the deprecated models from the allow-list, reject them upfront in the agent with a structured migration hint, and update existing scripts / docs / tests that reference them.

## Affected files

### Core (DALL-E pattern duplicated for Google)

- `src/types/provider2agent.ts`
  - Add `deprecatedGoogleImageModelHints: Record<string, string>` (single source of truth) plus a derived `DeprecatedGoogleImageModel` type via `keyof typeof`, mirroring the existing `deprecatedOpenAIImageModelHints` block
  - Cover all six documented deprecated model IDs
  - Drop `imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001` from `provider2ImageAgent.google.models`

- `src/agents/image_genai_agent.ts`
  - Import the new exports
  - Add `isDeprecatedGoogleImageModel` type guard and `buildDeprecatedGoogleModelMessage(model)` helper
  - Reject deprecated models upfront (before `new GoogleGenAI(...)` / API calls) with a structured cause: `agentGenerationError("imageGenAIAgent", imageAction, unsupportedModelTarget)`

### Tests

- `test/agents/test_image_genai_agent.ts` (new) — unit-test the helper for known-deprecated / supported / unknown model names; assert `imageGenAIAgent` rejects the 6 deprecated models upfront without an API call
- `test/utils/test_mulmo_config.ts` — replace the `"imagen-3"` literals on lines 226 and 236 with `"gemini-2.5-flash-image"`

### Test fixtures (scripts/test/)

Each fixture's purpose differs, so the migration strategy differs:

| File | Current intent | Migration |
|---|---|---|
| `test_vertexai.json` | matrix coverage of multiple Vertex AI image variants (default / ultra / fast) | Replace the three Imagen 4 references with three Gemini variants — `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview` — and rename the beat IDs (`imagen4_ultra_override` → `gemini_pro_image_override`, etc.) so the matrix coverage intent is preserved |
| `test_vertexai_simple.json` | one-shot Vertex AI smoke test of the default image model | Replace `imagen-4.0-generate-001` with `gemini-2.5-flash-image` |
| `test_genai.json` | Gemini API model enumeration | Delete the `imagen_4` and `imagen_4_ultra` beats. The `imagen_4` beat is already buggy (no `model` override, so it silently uses the default `gemini-2.5-flash-image` — the id/text are misleading). The `imagen_4_ultra` beat references `imagen-4.0-ultra-generate-preview-06-06` which has been shut down since 2026-02-17. The remaining three Gemini variants keep the enumeration intent |

### New deprecation-probe fixture

- `scripts/test/test_images_imagen_deprecated.json` (new) — mirrors `test_images_dalle_deprecated.json`. Each beat references one of the six deprecated Imagen IDs and documents that mulmocast rejects them upfront with a migration hint

### Docs

- `README.md:154` — replace the Imagen 4 example with `gemini-2.5-flash-image`
- `docs/vertexai_ja.md`, `docs/vertexai_en.md` — replace example snippets and rewrite the supported-models table (drop the three Imagen 4 rows, add Gemini image rows)

## Out of scope

- The `else` branch in `image_genai_agent.ts` that calls `ai.models.generateImages` (the Imagen-style API path) is **kept** — there may be unlisted / future Imagen variants. With the upfront deprecation gate, the listed models can never reach this branch, but removing the entire code path would cut off any future revival or undocumented model.
- The pre-existing typo `agentIncorrectAPIKeyError("imageGenAIAgent", ...)` in `src/agents/image_replicate_agent.ts:93` (flagged in PR #1367 by Codex, deferred there as out-of-scope) — still out of scope here. Separate follow-up PR.
- No refactor to share `buildDeprecatedXModelMessage` between the OpenAI and Google agents. Two ~3-line helpers is not duplication worth abstracting; revisit if a third provider needs the same pattern.

## Implementation steps

1. Add `deprecatedGoogleImageModelHints` and `DeprecatedGoogleImageModel` exports in `src/types/provider2agent.ts`; remove the three Imagen 4 GA entries from `provider2ImageAgent.google.models`
2. Update `src/agents/image_genai_agent.ts`: imports, `isDeprecatedGoogleImageModel` type guard, `buildDeprecatedGoogleModelMessage` helper, upfront throw with structured cause
3. Add `test/agents/test_image_genai_agent.ts`
4. Update `test/utils/test_mulmo_config.ts` (`"imagen-3"` → `"gemini-2.5-flash-image"`)
5. Migrate the three `scripts/test/test_*.json` fixtures per the table above
6. Add `scripts/test/test_images_imagen_deprecated.json`
7. Update `README.md` and the two `docs/vertexai_*.md` files
8. Run `yarn format && yarn lint && yarn build && yarn ci_test` — all green expected
9. Run `npx tsx ./src/cli/bin.ts images scripts/test/test_images_imagen_deprecated.json` to confirm the upfront rejection error message renders correctly
10. Commit-by-commit: (a) core (provider2agent + agent) + tests, (b) fixtures, (c) docs, (d) test-config helper update — for clean review

## Verification

- All deprecated Imagen IDs rejected upfront with the exact migration hint
- Existing supported models (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`) continue to work unchanged
- All test fixtures still describe what they claim to cover (no misleading beat names referencing models they don't actually use)
- Local checks all pass; cross-review by Codex and CodeRabbit on the PR before merge
