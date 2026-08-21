import type { MulmoMarkdownMedia } from "../../types/index.js";
import type { BeatHtmlFragment } from "./type.js";
import { renderMarkdownContent, renderMarkdownLayout, isMarkdownLayout } from "../image_plugins/markdown_layout.js";

/**
 * A `markdown` beat as markup for a browser host.
 *
 * The rendering itself is `image_plugins/markdown_layout.ts` — the same code the Node
 * render path uses, not a second implementation of it. This file supplies the two things
 * that are actually browser-specific: deterministic element ids, and the `requires`
 * report the host needs.
 *
 * Either markdown shape can embed a mermaid fence, which is why this can come back
 * requiring the mermaid runtime. A markdown beat is not obviously a diagram beat, and a
 * host that only loads mermaid for `mermaid` beats would render the diagram as nothing.
 * `requires` and the markup come from the same decision inside the renderer, so they
 * cannot disagree about what is a diagram.
 *
 * `idPrefix` has no default on purpose: a page-wide default gives two markdown beats the
 * same element ids, which is invalid HTML and sends mermaid at the wrong element.
 */
export const markdownToHtml = (image: MulmoMarkdownMedia, idPrefix: string): BeatHtmlFragment => {
  let counter = 0;
  const nextId = (): string => `${idPrefix}-mermaid-${counter++}`;
  const md = image.markdown;
  const { html, hasMermaid } = isMarkdownLayout(md) ? renderMarkdownLayout(md, nextId) : renderMarkdownContent(md, nextId);
  return { html, ...(hasMermaid ? { requires: ["mermaid" as const] } : {}) };
};
