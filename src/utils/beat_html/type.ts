import type { SlideBranding, SlideTheme } from "@mulmocast/deck";
import type { BackgroundImage, MulmoMediaSource } from "../../types/index.js";

/**
 * A beat rendered as markup for a browser host.
 *
 * Deliberately body-only. Tailwind, Chart.js, mermaid and fonts are shared across
 * beats, so emitting them per beat means N duplicate loads in a list view — which is
 * why `requires` names what the host needs instead of pulling it in. `src/actions/html.ts`
 * already works this way: it puts those CDNs in the document head once.
 */
export type BeatHtmlFragment = {
  /**
   * Body markup only — no `<html>`, `<head>` or `<style>`, and no `<script>` that this
   * module generated. An author's own script is a different matter: one written into an
   * `html_tailwind` beat's markup, into raw HTML inside a `markdown` beat, or into a
   * `textSlide` field arrives here verbatim, because nothing below sanitizes.
   *
   * **Not sanitized.** A beat is user data and `marked` does not sanitize: raw elements,
   * `onerror=` handlers and `javascript:` URLs written into a beat survive into this
   * string. Sanitize before inserting it into a DOM. Sanitizing here instead would be
   * worse than useless — it would read as a safety guarantee this module cannot make,
   * since it has no DOM and must stay dependency-light to remain bundleable.
   */
  html: string;
  /**
   * Rules the markup needs, scoped by the caller. Absent when the markup needs none.
   *
   * It cannot carry everything: an `html_tailwind` beat written with `elements` is a root
   * asking for 100% of its parent, and how tall that parent should be is the host's layout,
   * not the beat's. The root is marked `data-mulmo-swipe-root` so a host can give it one —
   * and a host that does not gets an empty box, silently.
   */
  css?: string;
  /**
   * Rules for the whole document — `html` and `body` — painting the beat's background image
   * behind the page, as the PNG render does. Absent when the beat has no background.
   *
   * Apply it only where the beat owns the document (an iframe, a print page). Injected into a
   * page shared with anything else it restyles that page: it cannot be scoped to the markup,
   * because a text beat's markup has no root of its own and the PNG paints the background on
   * `body`, behind the body's margin as well.
   */
  documentCss?: string;
  /**
   * `<script>` elements for the end of the beat's own document: an `html_tailwind` beat's author
   * `script`, swipe driver and animation runtime, which bring it to what the PNG shows — for an
   * animation, the final frame. Absent when the beat runs none.
   *
   * Only for a host that gives the beat a document of its own and lets it run scripts (an iframe
   * with `allow-scripts`); `html` alone is the beat at rest. Not sanitized: the author script is
   * the beat's content, as on the PNG path.
   */
  documentScript?: string;
  /** External runtimes the host must load once for the page, not once per beat. */
  requires?: BeatRuntime[];
  /**
   * Extra Chart.js plugin CDNs this beat's chart type needs, on top of Chart.js itself.
   * Same shape as `@mulmocast/deck`'s `SlideFragment.chartPlugins`, so one host can load
   * for both. Absent when the beat needs none.
   */
  chartPlugins?: string[];
  /**
   * Which mermaid theme suits this beat's background. A dark slide with a light diagram is
   * unreadable, and the host initialises mermaid once for the page, so it has to be told.
   * Absent unless the beat both requires mermaid and has an opinion.
   */
  mermaidTheme?: "dark" | "default";
};

/** External runtimes a fragment can depend on. */
export type BeatRuntime = "chart" | "mermaid";

export type BeatHtmlOptions = {
  /**
   * Prefix for element ids generated inside a fragment (mermaid containers, and chart
   * canvases later). Required, and deliberately so.
   *
   * A page-wide default was the first design, and review found what it does: two markdown
   * beats each start their counter at zero, so both emit `<div id="…-mermaid-0">`. That is
   * invalid HTML and sends mermaid at whichever element it finds first. There is no value
   * a library can pick that is unique per beat AND stable across re-renders — only the
   * caller knows which beat this is, so the caller says.
   *
   * Must match `[A-Za-z_][A-Za-z0-9_-]*`: the id ends up in an HTML attribute and, for some
   * beat types, in a JavaScript string literal inside a `<script>` where HTML entities are
   * not decoded, and it has to stay usable from a CSS selector. Restricting the set is what
   * makes one id safe in all of them — see `element_id.ts`.
   *
   * A beat's `id` comes from the script and is not restricted, so pass something derived
   * from its index — `beat-3`, not `3`, since it must not start with a digit — or sanitize
   * the id yourself. `beatToHtml` throws rather than guessing.
   */
  idPrefix: string;
  /**
   * The deck-level slide theme, for the beats deck draws: `slide`, `chart` and `mermaid`.
   * A slide beat's own `image.theme` wins over it, and the built-in `corporate` theme is the
   * fallback — the same order
   * `MulmoPresentationStyleMethods.getResolvedSlideTheme` uses on the Node side.
   *
   * Optional because only those beats read it, and because the host may not have a deck
   * theme to give.
   */
  slideTheme?: SlideTheme;
  /**
   * The deck's `imageParams.backgroundImage`. A beat's own `backgroundImage` wins over it and a
   * beat-level `null` switches it off — the order `resolveBackgroundImage` uses on the Node side.
   * textSlide and markdown beats get it as `documentCss`; chart and mermaid beats, which deck
   * draws as a figure slide, as that slide's background layer.
   */
  backgroundImage?: BackgroundImage;
  /**
   * The deck's `slideParams.branding` (logo and background) for slide beats. A beat's own
   * `branding` wins over it and a beat-level `null` switches it off, as on the Node side.
   */
  branding?: SlideBranding;
  /**
   * Turns a background or branding image into a URL the host's page can load. The default uses
   * a url as written and a path as written, and skips a base64 source — the schema carries no
   * media type to build a `data:` URI from. A host whose scripts sit next to local files
   * resolves paths here. What it returns is percent-encoded where it would otherwise break out
   * of a CSS string or an HTML attribute.
   */
  resolveMediaUrl?: (source: MulmoMediaSource) => string | undefined;
};
