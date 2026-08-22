import type { MulmoBeat } from "../../types/index.js";
import type { BeatHtmlFragment, BeatHtmlOptions } from "./type.js";
import { textSlideToHtml } from "./text_slide.js";
import { chartToHtml } from "./chart.js";
import { markdownToHtml } from "./markdown.js";
import { imageToHtml, movieToHtml } from "./media.js";
import { mermaidToHtml } from "./mermaid.js";
import { assertSafeElementId } from "../element_id.js";

export type { BeatHtmlFragment, BeatHtmlOptions, BeatRuntime } from "./type.js";
export { textSlideToMarkdown, textSlideToHtml } from "./text_slide.js";
export { markdownToHtml } from "./markdown.js";

/**
 * Beat image types this module can turn into markup, extended one type at a time.
 * `test_dispatch.ts` asserts this list and `beatToHtml` agree in both directions, so
 * a type added here without a case — or vice versa — fails rather than silently
 * rendering nothing.
 */
export const supportedBeatTypes = ["textSlide", "markdown", "chart", "mermaid", "image", "movie"] as const;

/**
 * Render a beat as markup for a browser host.
 *
 * **The markup is not sanitized** — see `BeatHtmlFragment.html`. Sanitize before inserting
 * it into a DOM.
 *
 * `options.idPrefix` is required and must match `[A-Za-z_][A-Za-z0-9_-]*`: fragments generate
 * element ids, only the caller knows which beat this is, and a beat's own `id` comes from
 * the script and is unrestricted. Throws on anything else rather than guessing a repair,
 * because a guess can collapse two beats onto one id. See `BeatHtmlOptions`.
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
  assertSafeElementId(options.idPrefix);
  switch (image.type) {
    case "textSlide":
      return textSlideToHtml(image);
    case "markdown":
      return markdownToHtml(image, options.idPrefix);
    case "chart":
      return chartToHtml(image, options.idPrefix);
    case "mermaid":
      return mermaidToHtml(image, options.idPrefix);
    case "image":
      // The only description of the picture this module can reach. A host with more should
      // set its own alt; an <img> with none makes a screen reader read the file name.
      return imageToHtml(image, beat.description ?? beat.text ?? "");
    case "movie":
      return movieToHtml(image);
    default:
      return undefined;
  }
};
