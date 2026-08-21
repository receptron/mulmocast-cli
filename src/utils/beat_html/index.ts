import type { MulmoBeat } from "../../types/index.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";
import { textSlideToHtml } from "./text_slide.js";
import { markdownToHtml } from "./markdown.js";

export type { BeatHtmlFragment, BeatHtmlOptions, BeatRuntime } from "./type.js";
export { textSlideToMarkdown, textSlideToHtml } from "./text_slide.js";
export { markdownToHtml } from "./markdown.js";
export { mermaidBlockHtml } from "./mermaid_block.js";

/**
 * Beat image types this module can turn into markup, extended one type at a time.
 * `test_dispatch.ts` asserts this list and `beatToHtml` agree in both directions, so
 * a type added here without a case — or vice versa — fails rather than silently
 * rendering nothing.
 */
export const supportedBeatTypes = ["textSlide", "markdown"] as const;

/**
 * Render a beat as markup for a browser host.
 *
 * **The markup is not sanitized** — see `BeatHtmlFragment.html`. Sanitize before inserting
 * it into a DOM.
 *
 * `options.idPrefix` is required: fragments can generate element ids, and only the caller
 * knows which beat this is. See `BeatHtmlOptions`.
 *
 * Returns `undefined` for a beat this module cannot render — a type not yet supported,
 * or one whose media it cannot reach from a browser (a local file path, say). Callers
 * decide what to show in its place; this module does not invent a placeholder.
 *
 * Everything here must stay browser-safe: no `node:*`, no filesystem, no
 * `MulmoStudioContext`. `test_browser_safety.ts` walks the import graph and fails on
 * anything that would drag Node into a bundle — the failure mode is a runtime error in
 * the browser, not a compile error, so it has to be checked mechanically.
 */
export const beatToHtml = (beat: MulmoBeat, options: BeatHtmlOptions): BeatHtmlFragment | undefined => {
  const image = beat.image;
  if (!image) return undefined;
  switch (image.type) {
    case "textSlide":
      return textSlideToHtml(image);
    case "markdown":
      return markdownToHtml(image, options.idPrefix);
    default:
      return undefined;
  }
};
