import { marked } from "marked";
import type { MulmoMarkdownMedia, MulmoMarkdownLayout, MulmoRow2, MulmoGrid2x2 } from "../../types/index.js";
import type { BeatHtmlFragment } from "./type.js";
import { mermaidBlockHtml } from "./mermaid_block.js";

/** A markdown field is written either as one string or as lines to be joined. */
const toMarkdownString = (content: string | string[]): string => (Array.isArray(content) ? content.join("\n") : content);

const MERMAID_FENCE = /```mermaid\n([\s\S]*?)```/g;

/**
 * Mermaid fences become mermaid markup before `marked` sees them, so the diagram is not
 * rendered as a code block. Ids come from a counter the caller owns rather than from
 * `node:crypto`, so re-rendering the same beat produces the same markup — a host that
 * diffs the fragment should not see every diagram change identity on every render.
 */
const replaceMermaidFences = (text: string, nextId: () => string): { text: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const replaced = text.replace(MERMAID_FENCE, (_match, code: string) => {
    hasMermaid = true;
    return mermaidBlockHtml(code, nextId());
  });
  return { text: replaced, hasMermaid };
};

const render = (content: string | string[], nextId: () => string): { html: string; hasMermaid: boolean } => {
  const { text, hasMermaid } = replaceMermaidFences(toMarkdownString(content), nextId);
  return { html: marked.parse(text, { async: false }), hasMermaid };
};

/** The object form of `markdown`, as opposed to a plain string or array of lines. */
const isLayout = (md: MulmoMarkdownMedia["markdown"]): md is MulmoMarkdownLayout => typeof md === "object" && !Array.isArray(md);

const wrap = (className: string, inner: string): string => `<div class="${className}">${inner}</div>`;

const HEADER = "shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50";
const SIDEBAR = "shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto";
const CELL = "overflow-auto p-4 bg-gray-50 rounded-lg";

const layoutHtml = (md: MulmoMarkdownLayout, nextId: () => string): { html: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const part = (content: string | string[], proseClass: string): string => {
    const r = render(content, nextId);
    hasMermaid = hasMermaid || r.hasMermaid;
    return wrap(proseClass, r.html);
  };

  const parts: string[] = ['<div class="w-full h-full flex flex-col overflow-hidden">'];
  if (md.header) parts.push(wrap(HEADER, part(md.header, "prose prose-lg max-w-none")));
  parts.push('<div class="flex-1 flex min-h-0 overflow-hidden">');
  if (md["sidebar-left"]) parts.push(wrap(SIDEBAR, part(md["sidebar-left"], "prose prose-sm max-w-none")));
  parts.push('<div class="flex-1 p-6 overflow-auto">');

  if ("row-2" in md) {
    const [left, right] = md["row-2"] satisfies MulmoRow2;
    const columns = [left, right].map((c) => wrap("flex-1 overflow-auto", part(c, "prose max-w-none"))).join("");
    parts.push(wrap("h-full flex gap-6", columns));
  } else if ("2x2" in md) {
    const cells = (md["2x2"] satisfies MulmoGrid2x2).map((c) => wrap(CELL, part(c, "prose prose-sm max-w-none"))).join("");
    parts.push(wrap("h-full grid grid-cols-2 grid-rows-2 gap-4", cells));
  } else if ("content" in md) {
    parts.push(part(md.content, "prose max-w-none"));
  }

  parts.push("</div>", "</div>", "</div>");
  return { html: parts.join(""), hasMermaid };
};

/**
 * A `markdown` beat as markup.
 *
 * Two shapes: a plain string (or lines) rendered straight through, and the object form
 * with header / sidebar / row-2 / 2x2 / content slots laid out in Tailwind.
 *
 * Either can embed a mermaid fence, which is why this can come back requiring the mermaid
 * runtime — a markdown beat is not obviously a diagram beat, and a host that only loads
 * mermaid for `mermaid` beats would render the diagram as nothing.
 */
export const markdownToHtml = (image: MulmoMarkdownMedia, idPrefix: string): BeatHtmlFragment => {
  let counter = 0;
  const nextId = (): string => `${idPrefix}-mermaid-${counter++}`;
  const md = image.markdown;
  const { html, hasMermaid } = isLayout(md) ? layoutHtml(md, nextId) : render(md, nextId);
  return { html, ...(hasMermaid ? { requires: ["mermaid" as const] } : {}) };
};
