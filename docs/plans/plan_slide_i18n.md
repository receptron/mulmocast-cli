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
- In the images action / `imagePreprocessAgent` (`src/actions/image_agents.ts`), before invoking a text-based plugin, build the localized payload: `localizedImage = plugin.applyStrings(beat.image, resolve(catalog[context.lang], extractStrings(beat.image)))` and render from it.
- Add `lang` to the slide render output path + cache key (mirror `getBeatAudioPathOrUrl`), so `-l ja` renders/caches a separate PNG. Default lang (== script lang) keeps the current path for backward compatibility.
- `movie` / `pdf` already run per active `context.lang`, so they pick up the localized image automatically.

### 5. Author override (optional, layered)

Like editing a `.po` entry by hand, allow the script to pin exact wording, reusing the existing `speaker.lang[lang]` precedent — e.g. an optional `image.lang[lang]` override that wins over the LLM catalog. Deferred to a follow-up; the catalog is the primary mechanism.

## Usage: author templates, API, CLI

### A. What the author writes (MulmoScript templates)

**Automatic (no script change).** Any existing text-based slide beat is localized just by running with a target language — the author writes nothing extra:

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

`mulmo movie deck.json -l ja` → `title`/`bullets` and the markdown heading/list render in Japanese, **same layout**; `**` markup, the number `20%`, and any URLs/code are preserved.

**Author override (exact wording), optional.** Mirroring the existing `speaker.lang[lang]` precedent, an author can pin wording per language via a `lang` map on the image payload; it wins over the LLM catalog:

```json
{
  "type": "textSlide",
  "slide": { "title": "2026 Roadmap", "bullets": ["Launch beta", "Expand to EU"] },
  "lang": {
    "ja": { "slide": { "title": "2026年ロードマップ", "bullets": ["ベータ公開", "EUへ展開"] } }
  }
}
```

(Schema shown for completeness; the override layer is a later phase — the catalog is the primary mechanism.)

### B. Public API changes

- **`translate(context, args?)`** — signature unchanged (`args?: PublicAPIArgs & { targetLangs?: string[] }`). Behavior addition: it now also **extracts and translates the slide catalog** into the `_lang.json` multiLingual file. Backward compatible — the `slideCatalog` field is simply absent for scripts with no text-based slides.
- **`src/utils/slide_i18n.ts` (new, exported from `index.common`, pure / browser-safe):**
  - `extractSlideStrings(image: MulmoImage): I18nField[]`
  - `applySlideStrings(image: MulmoImage, resolved: Record<string, string>): MulmoImage`
  - `slideStringKey(source: string): string` — `sha256`, the catalog key
  - inline-markup placeholder tokenizer (`<0>…</0>` ↔ inline nodes)
- **Plugin interface** (`src/utils/image_plugins/index.ts`): optional `extractStrings` / `applyStrings` on text-based plugins (see Design §1).
- **Schema / types**: `slideCatalog` added to `mulmoStudioMultiLingualFileSchema` (`lang → (sha256(source) → translated)`) → new exported type. Because `src/types/` changes, **`@mulmocast/types` needs a release**.
- **Estimator**: slide strings surface as additional `translate`-process records; `estimateUsage` must run the same extractor so `--estimate` reflects the extra token cost (wire the extractor into the estimator's translate scope).

### C. CLI

No new command or flag in the default design — it rides the existing translation flow (which already keys off `-l` / `captionParams.lang` and writes `<name>_lang.json`):

```bash
# Build translations (incl. slideCatalog) into deck_lang.json
mulmo translate deck.json -l ja

# Render localized slides (runTranslateIfNeeded builds the catalog first)
mulmo images deck.json -l ja
mulmo movie  deck.json -l ja        # localized audio + captions + slides
mulmo pdf    deck.json -l ja

# Multiple targets: -l and captionParams.lang both feed targetLangs (as today)

# Cost preview includes the extra slide-translation tokens
mulmo movie deck.json -l ja --estimate
```

- **Default**: slides localize automatically whenever `targetLangs` differ from `script.lang`, consistent with how audio and captions already behave. Per-language slide renders use a lang-suffixed cache path (mirrors `_<lang>.mp3`); the default-language run is byte-identical to today.
- **Opt-out** (cost control, ties to open question #5): a config gate such as `presentationStyle.i18n.translateSlides: false` — proposed, left to discussion rather than a CLI flag, to keep parity with the config-driven `captionParams`.

## Files touched (first scope)

- `src/types/schema.ts` — `slideCatalog` on the multiLingual file schema; optional `lang` override map on text-based image schemas (`mulmoTextSlideMediaSchema` etc.).
- `src/utils/image_plugins/index.ts` — extend the plugin type with `extractStrings`/`applyStrings`.
- `src/utils/image_plugins/{text_slide,markdown,slide}.ts` — implement the two methods.
- `src/utils/slide_i18n.ts` (new) — catalog helpers (hash key, dedupe, resolve, placeholder tokenizer for inline markup), pure/browser-safe.
- `src/index.common.ts` — export `slide_i18n` helpers.
- `src/actions/translate.ts` — extract + translate the catalog into `_lang.json`.
- `src/actions/image_agents.ts` / `images.ts` — apply localized payload + lang in render path/cache.
- `src/utils/estimate_usage.ts` — run the extractor so `--estimate` counts slide-translation tokens.
- `src/utils/prompt.ts` — slide-translation system prompt.
- `test/utils/test_slide_i18n.ts` (new), plus golden per-lang render fixtures.
- `@mulmocast/types` release (because `src/types/` changes).

## Phasing

1. **P1** — catalog infra + `textSlide` (structured, lowest risk) end-to-end: extract → translate → per-lang render.
2. **P2** — `markdown` (block-level placeholder extraction via `marked`).
3. **P3** — deck `slide` (needs `@mulmocast/deck` field exposure).
4. **P4** — `html_tailwind` (DOM text nodes + attribute whitelist; skip `script`/classes/`elements`), `chart`/`mermaid` labels.

## Testing

- Unit: extractor/injector round-trip per plugin (extract→translate-stub→apply reproduces structure with swapped text); placeholder preservation for inline markup; hash-key dedup; token protection of numbers/URLs/code.
- Golden: render `textSlide`/`markdown` beats in `en` and `ja` and diff against stored per-lang PNph fixtures (mock translator, no API key).
- Regression: default-lang run produces byte-identical output to today (no `_<lang>` suffix, no catalog).

## Open questions (for discussion / codex)

1. **Catalog scope** — deck-level (dedupe, proposed) vs per-beat (simpler, matches current multiLingual shape). Trade dedup savings vs. structural consistency.
2. **Markdown granularity** — block-level `<Trans>`-style placeholders (coherent sentences, more complex) vs. per-inline-text-node (simpler, risks fragmented translations). Proposal: block-level.
3. **Keying** — source-string-as-key (proposed, gettext) vs. path-based stable IDs (survive edits). Homograph/context handling (`msgctxt`) — needed now or later?
4. **Per-language rendering cost** — render only `context.lang` per run (proposed, minimal) vs. render all `targetLangs` upfront. Interaction with the image cache and `-f`.
5. **Opt-in** — always translate slides when `targetLangs` differ, or gate behind a flag / `captionParams`-like config to avoid surprising cost?
6. **Deck coupling** — is modifying `@mulmocast/deck` to expose translatable fields acceptable, or should deck slides be out of first scope?
