import { isSwipeElements, swipeElementsToHtml } from "../swipe_to_html.js";

/**
 * The static markup an html_tailwind beat shows. Pure — no Node, no filesystem — because the
 * Node dump path and the browser fragment path show the same thing.
 *
 * Deliberately generates no `<script>`: the author's `script` FIELD, the swipe animation
 * driver and the frame-based `animation` all need script execution, which the dump path has
 * never emitted and which a fragment injected through `innerHTML` could not run anyway.
 * Both paths show the beat's markup at rest.
 *
 * A `<script>` the author wrote inside `html` is another thing entirely: it is markup, and
 * it passes through, because this beat type is raw author markup by design.
 *
 * The author's `html` is emitted as written. It is markup by design on this beat type — the
 * schema also accepts a `script` — so escaping it would break the feature rather than
 * protect anything the author does not already have.
 */
export type HtmlTailwindMarkupSource = {
  html?: string | string[];
  elements?: unknown;
};

export const htmlTailwindMarkup = (image: HtmlTailwindMarkupSource): string => {
  if (isSwipeElements(image.elements) && image.elements.length > 0) {
    return swipeElementsToHtml(image.elements);
  }
  const html = image.html ?? "";
  return Array.isArray(html) ? html.join("\n") : html;
};
