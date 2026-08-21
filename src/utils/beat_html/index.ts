import type { MulmoBeat } from "../../types/index.js";
import type { BeatHtmlFragment } from "./type.js";
import { textSlideToHtml } from "./text_slide.js";

export type { BeatHtmlFragment, BeatRuntime } from "./type.js";
export { textSlideToMarkdown, textSlideToHtml } from "./text_slide.js";

/**
 * Beat image types this module can turn into markup, extended one type at a time.
 * `test_dispatch.ts` asserts this list and `beatToHtml` agree in both directions, so
 * a type added here without a case — or vice versa — fails rather than silently
 * rendering nothing.
 */
export const supportedBeatTypes = ["textSlide"] as const;

/**
 * Render a beat as markup for a browser host.
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
export const beatToHtml = (beat: MulmoBeat): BeatHtmlFragment | undefined => {
  const image = beat.image;
  if (image?.type === "textSlide") return textSlideToHtml(image);
  return undefined;
};
