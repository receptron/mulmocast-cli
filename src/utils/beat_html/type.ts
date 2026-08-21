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
