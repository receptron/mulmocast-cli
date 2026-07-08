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
- `extractStrings` / `applyStrings` are pure and operate on a `MulmoImage` payload copy — the render code (`process`/`markdown`/`html`) is untouched and simply runs on the localized payload.

Per-plugin extractor implementations (first scope):
- **textSlide** — trivial: `title`, `subtitle`, each `bullets[i]` are fields keyed by path.
- **markdown** — walk the `marked` token stream (`marked` is already a dependency) and collect **block-level** text (`heading`, `paragraph`, `list_item`) with inline markup preserved as `<0>…</0>` placeholders (`<Trans>` style); skip `code`, `codespan`, raw `html`, and link `href`. Re-inject by restoring placeholders.
- **deck slide** — extract the deck slide's text fields; depends on `@mulmocast/deck` exposing them (may need a small helper upstream).
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

In `src/actions/translate.ts`, add a slide-catalog stage alongside the existing beat-text translation:
1. **Extract**: for every beat whose plugin has `extractStrings`, collect all `I18nField`s across the deck → dedupe by `key`.
2. **Translate**: for each target lang, translate only keys missing from `slideCatalog[lang]` (hash-cache hit = skip, mirroring `localizedTextCacheAgentFilter`). Use a system prompt tuned for "translate UI/slide strings; keep `<n>…</n>` placeholders, numbers, URLs, and code verbatim." Token-protect numbers/URLs/code the way i18n protects interpolation.
3. **Store** into `slideCatalog[lang]`.

### 4. Render pipeline (apply + per-language output)

Localization is the rendering-side mirror of how audio already writes `<hash>_<lang>.mp3`:
- Only when a **slide language** is set (see §5). In the images action / `imagePreprocessAgent` (`src/actions/image_agents.ts`), before invoking a text-based plugin, resolve each string by the §5 precedence (`image.lang` → `slideCatalog[slideLang]` → source) and build the localized payload: `localizedImage = plugin.applyStrings(beat.image, resolved)`; render from it.
- Add the slide language to the render output path + cache key (mirror `getBeatAudioPathOrUrl`), so a `ja` slide renders/caches a separate PNG. No slide language (== source) keeps the current path — backward compatible and byte-identical.
- The slide language comes from `slideParams.lang` / `--slide-lang`, **not** `context.lang`, so it is independent of audio and captions.

### 5. Language selection: opt-in, independent, and author-provided

Three requirements drive this section:

**Opt-in (off by default).** Slide localization must be explicitly requested; not requesting it leaves slides in the source language exactly as today. There is no "translate slides automatically because the audio language differs" behavior — a deck whose slides should stay in the original language simply doesn't set a slide language. This is the safe default for cost and for decks where on-screen text is intentionally monolingual (code, brand terms, product names).

**Independent from audio and captions.** The slide language is its own setting, decoupled from the audio language (`-l` / `context.lang`) and the caption language (`captionParams.lang`). All three can differ — e.g. Japanese narration, English captions, Japanese slides — so slide localization does **not** reuse the audio/caption `targetLangs`; it has its own `slideParams.lang` (config) / `--slide-lang` (CLI).

**Author-provided translations are first-class (not LLM-only).** An author can supply exact per-language wording via a `lang` map on the image payload, reusing the existing `speaker.lang[lang]` precedent. This is a **P1** feature, not a follow-up. Resolution precedence per string:

1. `image.lang[slideLang]` — author-provided wording (verbatim, no LLM)
2. `slideCatalog[slideLang][sha256(source)]` — LLM catalog
3. source string — untranslated fallback

A fully author-authored multilingual deck (every slide has `image.lang` for the target) therefore needs **no `OPENAI_API_KEY` and no translate step at all** — the render just resolves from `image.lang`. The LLM catalog only fills the gaps the author left.

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

- `--slide-lang` may be repeatable / comma-separated for multi-language builds (`--slide-lang ja,fr`), mirroring how audio/captions handle multiple `targetLangs`.
- Per-slide-language renders use a slide-lang-suffixed cache path (mirrors `_<lang>.mp3`); a run without `--slide-lang` is byte-identical to today.
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

1. **P1** — opt-in plumbing (`--slide-lang` / `slideParams.lang`, independent axis) + `image.lang` author-override resolution + catalog infra + `textSlide` (structured, lowest risk) end-to-end: resolve → (translate gaps) → per-lang render. Note: author-override + opt-in are P1, not deferred.
2. **P2** — `markdown` (block-level placeholder extraction via `marked`).
3. **P3** — deck `slide` (needs `@mulmocast/deck` field exposure).
4. **P4** — `html_tailwind` (DOM text nodes + attribute whitelist; skip `script`/classes/`elements`), `chart`/`mermaid` labels.

## Testing

- Unit: extractor/injector round-trip per plugin (extract→translate-stub→apply reproduces structure with swapped text); placeholder preservation for inline markup; hash-key dedup; token protection of numbers/URLs/code.
- Golden: render `textSlide`/`markdown` beats in `en` and `ja` and diff against stored per-lang PNG fixtures (mock translator, no API key).
- Opt-in: no `--slide-lang` → no catalog, no extra render, byte-identical to today. Independence: `-l ja -c en --slide-lang fr` produces the three languages on their respective outputs.
- Author-override: a beat with full `image.lang[ja]` renders the ja slide with **zero** translator calls; partial `image.lang` falls back to the catalog only for the missing strings.

## Open questions (for discussion / codex)

1. **Catalog scope** — deck-level (dedupe, proposed) vs per-beat (simpler, matches current multiLingual shape). Trade dedup savings vs. structural consistency.
2. **Markdown granularity** — block-level `<Trans>`-style placeholders (coherent sentences, more complex) vs. per-inline-text-node (simpler, risks fragmented translations). Proposal: block-level.
3. **Keying** — source-string-as-key (proposed, gettext) vs. path-based stable IDs (survive edits). Homograph/context handling (`msgctxt`) — needed now or later?
4. **Per-language rendering cost** — render only the requested `slideLangs` per run (proposed, minimal) vs. render all upfront. Interaction with the image cache and `-f`.
5. ~~Opt-in~~ **Resolved** — slide localization is opt-in via `--slide-lang` / `slideParams.lang`, an axis independent of audio (`-l`) and captions (`-c`); author-provided `image.lang` is first-class. Remaining sub-question: exact config field name (`slideParams.lang` vs a dedicated `i18nParams`) and whether `--slide-lang` should accept multiple values.
6. **Deck coupling** — is modifying `@mulmocast/deck` to expose translatable fields (and honor `image.lang`) acceptable, or should deck slides be out of first scope?
