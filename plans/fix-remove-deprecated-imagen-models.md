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
| `scripts/samples/image_animation_showcase.json` | animation showcase that consumes test_genai.json's generated PNGs | Hard-codes 9 references to `../../output/images/test_genai/imagen_4.png` / `imagen_4_ultra.png`. With the test_genai beat removals those filenames are no longer generated. Remap the references to surviving Gemini variant outputs — `imagen_4.png` → `gemini_3_1_flash_image_preview.png` (already a beat in test_genai.json, just not yet shown in the showcase), `imagen_4_ultra.png` → `gemini_3_pro_image_preview.png` (already in showcase; reuse). This preserves the 3-distinct-image animation matrix |

### New deprecation-probe fixture

- `scripts/test/test_images_imagen_deprecated.json` (new) — mirrors `test_images_dalle_deprecated.json`. Each beat references one of the six deprecated Imagen IDs and documents that mulmocast rejects them upfront with a migration hint

### Docs

- `README.md`
  - line 142 — narrative “access models like Imagen 4” → use a non-deprecated example (e.g., reference Gemini image / Veo movie / Vertex-only features) so the rationale for Vertex AI doesn't depend on a removed model
  - line 154 — example snippet `imagen-4.0-generate-001` → `gemini-2.5-flash-image`
- `docs/vertexai_ja.md`, `docs/vertexai_en.md`
  - line 14 (both) — narrative claim that “some models (e.g., Imagen 4) may only be available through Vertex AI” → revise to either drop the Imagen-specific framing or replace the example with a model that genuinely is Vertex-AI-only (the Veo movie family is a fair example)
  - example snippets at lines 73 / 122 → replace `imagen-4.0-*` with `gemini-2.5-flash-image` (and `gemini-3-pro-image-preview` for the override slot)
  - supported-models tables at lines 146-148 — drop the three Imagen 4 rows and add corresponding Gemini image rows (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`)

## Out of scope

- The `else` branch in `image_genai_agent.ts` that calls `ai.models.generateImages` (the Imagen-style API path) is **kept** — there may be unlisted / future Imagen variants. With the upfront deprecation gate, the listed models can never reach this branch, but removing the entire code path would cut off any future revival or undocumented model.
- The pre-existing typo `agentIncorrectAPIKeyError("imageGenAIAgent", ...)` in `src/agents/image_replicate_agent.ts:93` (flagged in PR #1367 by Codex, deferred there as out-of-scope) — still out of scope here. Separate follow-up PR.
- No refactor to share `buildDeprecatedXModelMessage` between the OpenAI and Google agents. Two ~3-line helpers is not duplication worth abstracting; revisit if a third provider needs the same pattern.
- `docs/releasenote/index.md` references to Imagen 4 (e.g. line 44, 46 under the v1.2.0 section) are intentionally **not** updated. Release notes are an immutable historical record — they describe what each version shipped, not what is currently recommended. Rewriting them would be revisionism. Forward-looking docs (README, vertexai_*) absolutely need updating; historical release notes do not.

## Implementation steps

1. Add `deprecatedGoogleImageModelHints` and `DeprecatedGoogleImageModel` exports in `src/types/provider2agent.ts`; remove the three Imagen 4 GA entries from `provider2ImageAgent.google.models`
2. Update `src/agents/image_genai_agent.ts`: imports, `isDeprecatedGoogleImageModel` type guard, `buildDeprecatedGoogleModelMessage` helper, upfront throw with structured cause
3. Add `test/agents/test_image_genai_agent.ts`
4. Update `test/utils/test_mulmo_config.ts` (`"imagen-3"` → `"gemini-2.5-flash-image"`)
5. Migrate the three `scripts/test/test_*.json` fixtures per the table above
6. Migrate `scripts/samples/image_animation_showcase.json` PNG references in lockstep with the test_genai beat removals
7. Add `scripts/test/test_images_imagen_deprecated.json`
8. Update `README.md` and the two `docs/vertexai_*.md` files (narrative + snippets + tables, see Docs section)
9. Run `yarn format && yarn lint && yarn build && yarn ci_test` — all green expected
10. Run `npx tsx ./src/cli/bin.ts images scripts/test/test_images_imagen_deprecated.json` to confirm the upfront rejection error message renders correctly
11. Commit-by-commit: (a) core (provider2agent + agent) + tests + test-config update, (b) fixtures + showcase, (c) docs — for clean review

## Verification

- All deprecated Imagen IDs rejected upfront with the exact migration hint
- Existing supported models (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`) continue to work unchanged
- All test fixtures still describe what they claim to cover (no misleading beat names referencing models they don't actually use)
- Local checks all pass; cross-review by Codex and CodeRabbit on the PR before merge
