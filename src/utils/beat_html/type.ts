/**
 * A beat rendered as markup a browser host can drop into a `<div>`.
 *
 * Deliberately body-only. Tailwind, Chart.js, mermaid and fonts are shared across
 * beats, so emitting them per beat means N duplicate loads in a list view — which is
 * why `requires` names what the host needs instead of pulling it in. `src/actions/html.ts`
 * already works this way: it puts those CDNs in the document head once.
 */
export type BeatHtmlFragment = {
  /** Body markup only — no `<html>`, `<head>`, `<style>` or `<script>`. */
  html: string;
  /** Rules the markup needs, scoped by the caller. Absent when the markup needs none. */
  css?: string;
  /** External runtimes the host must load once for the page, not once per beat. */
  requires?: BeatRuntime[];
};

/** External runtimes a fragment can depend on. */
export type BeatRuntime = "chart" | "mermaid";
