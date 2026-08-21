import { Marked } from "marked";
import type { MulmoMarkdownMedia, MulmoMarkdownLayout, MulmoRow2, MulmoGrid2x2 } from "../../types/index.js";
import type { BeatHtmlFragment } from "./type.js";
import { mermaidBlockHtml } from "./mermaid_block.js";

/** A markdown field is written either as one string or as lines to be joined. */
const toMarkdownString = (content: string | string[]): string => (Array.isArray(content) ? content.join("\n") : content);

/**
 * A fence's info string can carry more than the language (```mermaid title="x"), and
 * marked hands it over verbatim. The language is its first word.
 */
const languageOf = (info: string | undefined): string => (info ?? "").trim().split(/\s+/)[0].toLowerCase();

/**
 * Renders markdown, turning fenced `mermaid` blocks into mermaid markup.
 *
 * Asked of marked's own lexer rather than matched against the raw source. A regex over
 * text was the first version and review found four inputs it got wrong: a CRLF fence and
 * a fence with trailing whitespace after the language were missed, while a mermaid fence
 * quoted INSIDE an outer ````markdown fence, and one inside an indented code block, were
 * converted — turning somebody's example of mermaid syntax into an actual diagram. marked
 * decides what is a code block and what language it is, so all four follow from asking it.
 *
 * A fresh `Marked` instance per call rather than the global `marked.use`, because the
 * renderer closes over this call's mermaid counter — a shared one would leak ids between
 * beats.
 */
const renderMarkdown = (content: string | string[], nextId: () => string): { html: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const md = new Marked({
    async: false,
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        if (languageOf(lang) !== "mermaid") return false;
        hasMermaid = true;
        return mermaidBlockHtml(text, nextId());
      },
    },
  });
  return { html: md.parse(toMarkdownString(content), { async: false }), hasMermaid };
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
    const rendered = renderMarkdown(content, nextId);
    hasMermaid = hasMermaid || rendered.hasMermaid;
    return wrap(proseClass, rendered.html);
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
 * mermaid for `mermaid` beats would render the diagram as nothing. `requires` and the
 * markup come from the same decision, so they cannot disagree about what is a diagram.
 *
 * `idPrefix` has no default on purpose: a page-wide default gives two markdown beats the
 * same element ids, which is invalid HTML and sends mermaid at the wrong element.
 */
export const markdownToHtml = (image: MulmoMarkdownMedia, idPrefix: string): BeatHtmlFragment => {
  let counter = 0;
  const nextId = (): string => `${idPrefix}-mermaid-${counter++}`;
  const md = image.markdown;
  const { html, hasMermaid } = isLayout(md) ? layoutHtml(md, nextId) : renderMarkdown(md, nextId);
  return { html, ...(hasMermaid ? { requires: ["mermaid" as const] } : {}) };
};
