# Plan: Localize text-based slide beats via a web-i18n message catalog

Issue: https://github.com/receptron/mulmocast-cli/issues/1472

## Goal

Make the on-screen text of **text-based slide beats** follow the target language, so a multilingual run produces translated slides — not just translated audio/captions. Keep the **layout/structure identical**; swap only the wording, using the web i18n model (gettext / i18next / react-i18next `<Trans>`).

## Background (current behavior)

- `src/actions/translate.ts` translates only `beat.text` (narration) per beat × target lang, storing it in the per-beat multiLingual data (`multiLingualTexts[lang].text`).
- `audio` and `captions` read the translated `text` via `localizedText` (`src/utils/utils.ts`).
- Text-based slide plugins render from `beat.image.*` and have **no language handling** — one language-agnostic PNG per beat:
  - `textSlide` → `beat.image.slide.title/subtitle/bullets[]` (`src/utils/image_plugins/text_slide.ts`)
  - `markdown` → `beat.image.markdown` (`src/utils/image_plugins/markdown.ts`)
  - deck `slide` → deck text fields via `@mulmocast/deck` (`src/utils/image_plugins/slide.ts`)
  - `html_tailwind` → `beat.image.html` (+ `script`, `elements`) (`src/utils/image_plugins/html_tailwind.ts`)
- Plugins are registered in `src/utils/image_plugins/index.ts` with `{ imageType, process, path, markdown?, html? }` and receive `ImageProcessorParams` (`beat`, `context`, `imagePath`, `canvasSize`, …). They read `beat.image` directly.

## Model: message catalog (extract → translate → apply)

| phase | web i18n | MulmoCast mapping |
|---|---|---|
| extract | scan source for `t("…")` / literals | per-plugin extractor pulls translatable strings from `beat.image.*` |
| translate | translate the catalog per locale, deduped | LLM translates the deduped catalog, cached by string hash |
| apply | `t(key)` substitutes at render | plugin re-injects localized strings into the same structure; render unchanged |

**Structure vs. strings**: layout, markup, Tailwind classes, code, URLs, and numbers are structure (never sent to the LLM, never changed); only human-readable strings enter the catalog.

## Design

### 1. Per-plugin i18n contract

Add two optional capabilities to the image-plugin interface (`src/utils/image_plugins/index.ts`), so only text-based plugins opt in:

```ts
type I18nField = { key: string; source: string; context?: string };
type ImagePlugin = {
  imageType: string;
  process: ...; path: ...; markdown?: ...; html?: ...;
  // NEW — present only on text-based plugins:
  extractStrings?: (image: MulmoImage) => I18nField[];
  applyStrings?: (image: MulmoImage, resolved: Record<string, string>) => MulmoImage; // returns a localized copy
};
```

- `key` = `sha256(source)` (gettext "source-string-as-key"): no ID management; identical strings across the whole deck dedupe to one translation; editing the source changes the key and re-translates (desired). Ties into the existing hash-based cache.
- `extractStrings` / `applyStrings` are pure and operate on a `MulmoImage` payload copy. **The localized payload is swapped in once, before *all* plugin methods run** (`process` **and** the `markdown` / `html` side channels), so the PNG **and** any markdown/HTML/PDF artifact derived from the same beat are localized consistently — otherwise the image localizes while a stored markdown/html artifact stays source-language (flagged by Codex).

Per-plugin extractor implementations (first scope):
- **textSlide** — trivial and safest: `title`, `subtitle`, each `bullets[i]` are structured fields keyed by path. **This is the MVP** (see Phasing) — no markdown round-trip, no deck coupling.
- **markdown** — walk the `marked` token stream (`marked` is already a dependency) and translate only a **constrained, safe subset**: `heading`, `paragraph`, `list_item` text, with inline markup preserved as `<0>…</0>` placeholders (`<Trans>` style). **Fall back to source (leave untranslated)** for constructs where round-trip fidelity is not guaranteed — nested lists, blockquotes, tables, raw inline `html`, code fences/spans, links — rather than risk corrupting them. `marked`'s source→HTML render is already lossy (`markdown.ts`, `markdown_layout.ts`), so extraction must round-trip through a validated serializer, not naive string surgery. Codex rates general markdown "too brittle as written"; the subset + fallback is the mitigation.
- **deck slide** — **out of P1.** `mulmoSlideMediaSchema` comes from `@mulmocast/deck` and is `.strict()` with no language hook, so both string extraction and any `image.lang` override require an **upstream deck release**. Defer until textSlide (+ markdown) prove the value.
- **html_tailwind** — deferred (see Phasing): parsing text nodes while preserving `<script>`, classes, and `elements` is the hardest case.

### 2. Catalog storage

Slide strings dedupe across the deck, so store a **deck-level catalog** (not per-beat) in the multiLingual file, parallel to the existing per-beat `text` translations:

```ts
// mulmoStudioMultiLingualFileSchema gains:
slideCatalog: z.record(langSchema, z.record(z.string(), z.string())).optional(),
// lang -> (sha256(source) -> translated)
```

Reuses one translation store, one `targetLangs`, shared with audio/captions. `localizedTextSchema` (per-beat) is unchanged.

### 3. Translate pipeline (extract + translate)

The existing beat-text graph in `src/actions/translate.ts` is beat-scoped and cache-keyed on `beat.text` (fans out beat → lang, `translate.ts:91`, `translate.ts:319`). Slide strings dedupe **deck-wide**, so they do **not** belong inside that per-beat graph. Add a **separate deck-wide slide-catalog pass** (before/outside the beat-text graph) that shares the `_lang.json` output:
1. **Extract**: for every beat whose plugin has `extractStrings`, and only for strings **not** already provided by `image.lang[slideLang]`, collect all `I18nField`s across the deck → dedupe by `key`.
2. **Translate**: only for the requested `slideLangs`, translate keys missing from `slideCatalog[lang]` (hash-cache hit = skip). **Input is a structured JSON array of fields** (`[{key, source, context?}]`), never raw concatenated markdown — this bounds prompt-injection from slide content. System prompt: "translate each `source`; keep `<n>…</n>` placeholders, numbers, URLs, and code verbatim; return the same array shape."
3. **Validate + store**: before accepting, check each result preserves its placeholder set/count and doesn't introduce markup; on any mismatch, **fall back to source** for that string. Store into `slideCatalog[lang]`.

### 4. Render pipeline (apply + per-language output)

Localization is the rendering-side mirror of how audio already writes `<hash>_<lang>.mp3`:
- Only when a **slide language** is set (see §5). In the images action / `imagePreprocessAgent` (`src/actions/image_agents.ts`), before invoking a text-based plugin, resolve each string by the §5 precedence (`image.lang` → `slideCatalog[slideLang]` → source) and build the localized payload: `localizedImage = plugin.applyStrings(beat.image, resolved)`; render from it.
- **Content-based render key, not just `_<lang>`.** Today the slide image path is beat-id based only (`file.ts:131`). A bare language suffix avoids cross-language collisions but does **not** invalidate a stale render when `image.lang` or a catalog entry changes. So the render cache key must hash the **effective localized payload** (the resolved strings actually rendered) plus the slide language — mirroring how `getBeatAudioPathOrUrl` hashes content, not just lang (Codex must-fix #3). No slide language (== source) keeps the current path — backward compatible and byte-identical.
- The slide language comes from `slideParams.lang` / `--slide-lang`, **not** `context.lang`, so it is independent of audio and captions.

### 5. Language selection: opt-in, independent, and author-provided

Three requirements drive this section:

**Opt-in (off by default).** Slide localization must be explicitly requested; not requesting it leaves slides in the source language exactly as today. There is no "translate slides automatically because the audio language differs" behavior — a deck whose slides should stay in the original language simply doesn't set a slide language. This is the safe default for cost and for decks where on-screen text is intentionally monolingual (code, brand terms, product names).

**Independent from audio and captions.** The slide language is its own setting, decoupled from the audio language (`-l` / `context.lang`) and the caption language (`captionParams.lang`). All three can differ — e.g. Japanese narration, English captions, Japanese slides — so slide localization does **not** reuse the audio/caption `targetLangs`; it has its own `slideParams.lang` (config) / `--slide-lang` (CLI).

**Author-provided translations are first-class (not LLM-only).** An author can supply exact per-language wording via a `lang` map on the image payload, reusing the existing `speaker.lang[lang]` precedent. This is **P1 for `textSlide` (and markdown)** — but note it requires **schema work**: `mulmoTextSlideMediaSchema` / `mulmoMarkdownMediaSchema` are `.strict()`, so the optional `lang` map must be added to each (Codex flagged that `image.lang` is currently illegal). Deck `slide` is excluded from P1 here too (its schema is upstream in `@mulmocast/deck`). Resolution precedence per string:

1. `image.lang[slideLang]` — author-provided wording (verbatim, no LLM)
2. `slideCatalog[slideLang][sha256(source)]` — LLM catalog
3. source string — untranslated fallback

A fully author-authored multilingual deck (every slide has `image.lang` for the target) therefore needs **no `OPENAI_API_KEY` and no translate step at all** — the render just resolves from `image.lang`. The LLM catalog only fills the gaps the author left.

**v1 scope**: a single requested slide language per run (`--slide-lang ja` / `slideParams.lang: "ja"`). Multi-language batch builds come later as an explicit loop over single-lang renders, not a combined mode — keeps cache naming and output management simple (Codex OQ5).

## Usage: author templates, API, CLI

### A. What the author writes (MulmoScript templates)

**LLM-translated (no script change).** Once slide localization is turned on (a slide language is set — see below; it is **off by default**), any existing text-based slide beat is localized without the author writing anything extra:

```json
{
  "$mulmocast": { "version": "1.1" },
  "lang": "en",
  "beats": [
    {
      "text": "Here is our roadmap for the year.",
      "image": {
        "type": "textSlide",
        "slide": { "title": "2026 Roadmap", "bullets": ["Launch beta", "Expand to EU"] }
      }
    },
    {
      "text": "The results so far.",
      "image": { "type": "markdown", "markdown": ["# Results", "- Revenue up **20%**", "- 3 new markets"] }
    }
  ]
}
```

`mulmo movie deck.json -l ja --slide-lang ja` → `title`/`bullets` and the markdown heading/list render in Japanese, **same layout**; `**` markup, the number `20%`, and any URLs/code are preserved. Without `--slide-lang` (or `slideParams.lang`), the slides stay in English.

**Author-provided wording (first-class).** Mirroring the existing `speaker.lang[lang]` precedent, an author pins exact wording per language via a `lang` map on the image payload. It takes precedence over the LLM catalog, and a slide fully covered by `image.lang` needs no LLM call at all:

```json
{
  "type": "textSlide",
  "slide": { "title": "2026 Roadmap", "bullets": ["Launch beta", "Expand to EU"] },
  "lang": {
    "ja": { "slide": { "title": "2026年ロードマップ", "bullets": ["ベータ公開", "EUへ展開"] } }
  }
}
```

Mix and match: fill `image.lang` for the strings you care about (headings, product names) and let the LLM catalog cover the rest. An author who fills every target string gets a fully hand-authored bilingual deck with **no API key and no translate step**.

### B. Public API changes

- **`translate(context, args?)`** — signature gains an independent `slideLangs?: string[]` (separate from the existing audio/caption `targetLangs`). It builds the slide catalog **only for `slideLangs`**, and **only for strings not already covered by `image.lang`**. When `slideLangs` is empty/unset, no slide translation runs (opt-in). Backward compatible — `slideCatalog` is absent otherwise.
- **`src/utils/slide_i18n.ts` (new, exported from `index.common`, pure / browser-safe):**
  - `extractSlideStrings(image: MulmoImage): I18nField[]`
  - `applySlideStrings(image: MulmoImage, resolved: Record<string, string>): MulmoImage`
  - `slideStringKey(source: string): string` — `sha256`, the catalog key
  - inline-markup placeholder tokenizer (`<0>…</0>` ↔ inline nodes)
- **Plugin interface** (`src/utils/image_plugins/index.ts`): optional `extractStrings` / `applyStrings` on text-based plugins (see Design §1).
- **Schema / types**: `slideCatalog` added to `mulmoStudioMultiLingualFileSchema` (`lang → (sha256(source) → translated)`) → new exported type. Because `src/types/` changes, **`@mulmocast/types` needs a release**.
- **Estimator**: slide strings surface as additional `translate`-process records; `estimateUsage` must run the same extractor so `--estimate` reflects the extra token cost (wire the extractor into the estimator's translate scope).

### C. CLI

Slide localization is **opt-in** via a dedicated `--slide-lang` flag (or `presentationStyle.slideParams.lang` in config), **independent** of `-l` (audio) and `captionParams.lang` (captions). Omit it → slides stay in the source language (today's behavior).

```bash
# Slides stay English (no slide localization requested)
mulmo movie deck.json -l ja                       # ja audio + captions, EN slides

# Independent axes — ja audio, EN captions, ja slides
mulmo movie deck.json -l ja -c en --slide-lang ja

# Slide-only translation on an English narration deck
mulmo images deck.json --slide-lang ja            # EN audio, ja slides

# Build just the slide catalog into deck_lang.json
mulmo translate deck.json --slide-lang ja

# Fully author-authored deck (image.lang filled) — no API key needed
mulmo images deck.json --slide-lang ja            # resolves from image.lang, no LLM call

# Cost preview includes the extra slide-translation tokens
mulmo movie deck.json --slide-lang ja --estimate
```

- v1 takes a **single** `--slide-lang`; multi-language builds are a later explicit loop over single-lang renders (Codex OQ5), not `--slide-lang ja,fr`.
- Per-slide-language renders use a **content-hashed, slide-lang-keyed** cache path (see Design §4); a run without `--slide-lang` is byte-identical to today.
- Resolves open question #5 (opt-in) and #1's coupling — slide language is its own axis, not `targetLangs`.

## Files touched (first scope)

- `src/types/schema.ts` — `slideCatalog` on the multiLingual file schema; optional `lang` override map on text-based image schemas (`mulmoTextSlideMediaSchema` etc.).
- `src/utils/image_plugins/index.ts` — extend the plugin type with `extractStrings`/`applyStrings`.
- `src/utils/image_plugins/{text_slide,markdown,slide}.ts` — implement the two methods.
- `src/utils/slide_i18n.ts` (new) — catalog helpers (hash key, dedupe, resolve, placeholder tokenizer for inline markup), pure/browser-safe.
- `src/index.common.ts` — export `slide_i18n` helpers.
- `src/actions/translate.ts` — extract + translate the catalog into `_lang.json`.
- `src/actions/image_agents.ts` / `images.ts` — resolve `image.lang` → catalog → source; apply localized payload + slide-lang in render path/cache.
- `src/cli/common.ts` + `{audio,image,movie,pdf,translate}` builders/handlers — `--slide-lang` flag (independent of `-l` / `-c`), threaded into the context.
- `src/types/schema.ts` — `slideParams.lang` config gate; `slideCatalog` on the multiLingual file; `lang` override map on text-based image schemas.
- `src/utils/estimate_usage.ts` — run the extractor so `--estimate` counts slide-translation tokens (only for `slideLangs`, minus `image.lang`-covered strings).
- `src/utils/prompt.ts` — slide-translation system prompt.
- `test/utils/test_slide_i18n.ts` (new), plus golden per-lang render fixtures.
- `@mulmocast/types` release (because `src/types/` changes).

## Phasing

**MVP (de-risked, per Codex)**: `textSlide` only — field-level translation of `title`/`subtitle`/`bullets`, opt-in plumbing, `image.lang` resolution, content-hashed per-lang render. No `marked` round-trip, no deck coupling, no deck-level cataloging risk. Prove value here first; the deck-level catalog can start as a thin store and only matters once a second plugin lands.

1. **P1 (MVP)** — opt-in plumbing (`--slide-lang` / `slideParams.lang`, independent axis) + `image.lang` author-override resolution (schema work on `mulmoTextSlideMediaSchema`) + `textSlide` structured extraction + content-hashed per-lang render. Author-override + opt-in are P1, not deferred.
2. **P2** — `markdown` (constrained safe subset via `marked`, with round-trip validation and fallback-to-source for unsupported constructs).
3. **P3** — deck `slide` (**requires an upstream `@mulmocast/deck` release** to expose text fields and honor `image.lang`).
4. **P4** — `html_tailwind` (DOM text nodes + attribute whitelist; skip `script`/classes/`elements`), `chart`/`mermaid` labels.

## Testing

- Unit: extractor/injector round-trip per plugin (extract→translate-stub→apply reproduces structure with swapped text); placeholder preservation for inline markup; hash-key dedup; token protection of numbers/URLs/code.
- Golden: render `textSlide`/`markdown` beats in `en` and `ja` and diff against stored per-lang PNG fixtures (mock translator, no API key).
- Opt-in: no `--slide-lang` → no catalog, no extra render, byte-identical to today. Independence: `-l ja -c en --slide-lang fr` produces the three languages on their respective outputs.
- Author-override: a beat with full `image.lang[ja]` renders the ja slide with **zero** translator calls; partial `image.lang` falls back to the catalog only for the missing strings.
- Translator robustness: injection attempt inside slide text is not obeyed (structured-JSON input); a translation that drops/duplicates a `<n>` placeholder or injects markup is rejected → source is kept.

## Security & robustness (Codex risks incorporated)

- **Prompt injection**: the translator receives a **structured JSON array of fields**, not concatenated markdown; the system prompt only translates `source` values. Output is schema-validated (same shape, same keys) before acceptance.
- **Markup/Tailwind/placeholder corruption**: after translation, validate that each string preserves its placeholder set and count and introduces no new markup; on mismatch, **fall back to the source string** (never render a corrupted slide).
- **Layout preservation is verified, not assumed**: golden per-lang render diffs catch cases where a longer translation overflows a fixed layout.

## Open questions — Codex recommendations folded in

1. **Catalog scope** — **deck-level `slideCatalog`** (source-hash dedup, decoupled from beat narration); keep per-beat `multiLingualTexts` for audio/captions. (Codex agrees.)
2. **Markdown granularity** — block-level, **constrained subset only** (heading/paragraph/list-item); fallback-to-source for nested/raw-HTML/table/code/link constructs. General markdown is out of scope until a validated serializer exists.
3. **Keying** — source-string-as-key (gettext); add `msgctxt`-style context only if real collisions appear. (Codex agrees.)
4. **Per-language rendering cost** — render only the requested single `slideLang` per run; batch = later explicit loop. (Codex agrees.)
5. ~~Opt-in~~ **Resolved** — opt-in via `--slide-lang` / `slideParams.lang`, independent of `-l`/`-c`; `image.lang` first-class. Sub-decisions: config field name `slideParams.lang` (Codex's pick) vs a dedicated `i18nParams`; single `--slide-lang` in v1.
6. **Deck coupling** — deck `slide` **out of P1**; ship `textSlide` (+ markdown) first, then decide on an upstream `@mulmocast/deck` localized API. (Codex agrees.)

## Review log

- **Codex cross-review (2026-07-08)** — verdict *NEEDS CHANGES*; 3 must-fix items (schema + render-path gaps for `image.lang`; brittle markdown extraction; explicit content-based cache keying) all evaluated as valid and folded into Design §1/§3/§4/§5, Security, and Phasing above.
