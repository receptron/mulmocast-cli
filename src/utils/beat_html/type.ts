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
   * Body markup only — no `<html>`, `<head>`, `<style>` or `<script>`.
   *
   * **Not sanitized.** A beat is user data and `marked` does not sanitize: raw elements,
   * `onerror=` handlers and `javascript:` URLs written into a beat survive into this
   * string. Sanitize before inserting it into a DOM. Sanitizing here instead would be
   * worse than useless — it would read as a safety guarantee this module cannot make,
   * since it has no DOM and must stay dependency-light to remain bundleable.
   */
  html: string;
  /** Rules the markup needs, scoped by the caller. Absent when the markup needs none. */
  css?: string;
  /** External runtimes the host must load once for the page, not once per beat. */
  requires?: BeatRuntime[];
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
   * Must match `[A-Za-z0-9_-]+`: the id ends up in an HTML attribute and, for some beat
   * types, in a JavaScript string literal inside a `<script>` where HTML entities are not
   * decoded. Restricting the set is what makes one id safe in both — see `element_id.ts`.
   *
   * A beat's `id` comes from the script and is not restricted, so pass its index in the
   * deck, or sanitize the id yourself. `beatToHtml` throws rather than guessing.
   */
  idPrefix: string;
};
