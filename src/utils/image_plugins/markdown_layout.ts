import { type MulmoMarkdownLayout, type MulmoRow2, type MulmoGrid2x2 } from "../../types/type.js";
import { Marked } from "marked";
import { mermaidHtml } from "./mermaid_html.js";

/**
 * The one markdown implementation, shared by the Node render path
 * (`image_plugins/markdown.ts`, which turns it into a PNG) and the browser fragment path
 * (`beat_html/markdown.ts`, which hands it to a host's DOM).
 *
 * Deliberately pure: no `node:*`, no filesystem, no puppeteer. That is what lets the
 * browser side import it rather than keep a second copy — and a second copy is not
 * hypothetical, it existed for one commit and the two immediately disagreed about which
 * fences are diagrams. `test/beat_html/test_browser_safety.ts` bundles the browser entry
 * with esbuild and fails if anything here reaches Node.
 *
 * Element ids come from a caller-supplied generator, because that is the only thing the
 * two callers genuinely need to differ on.
 */

/** A markdown field is written either as one string or as lines to be joined. */
export const toMarkdownString = (content: string | string[]): string => (Array.isArray(content) ? content.join("\n") : content);

/**
 * A fence's info string can carry more than the language (```mermaid title="x"), and
 * marked hands it over verbatim. The language is its first word.
 */
const languageOf = (info: string | undefined): string => (info ?? "").trim().split(/\s+/)[0].toLowerCase();

/**
 * Renders markdown, turning fenced `mermaid` blocks into mermaid markup.
 *
 * Asked of marked's own lexer rather than matched against the raw source. A regex over
 * text was what both copies used, and review found four inputs it got wrong: a CRLF fence
 * and a fence with trailing whitespace after the language were missed, while a mermaid
 * fence quoted INSIDE an outer ````markdown fence, and one inside an indented code block,
 * were converted — turning somebody's example of mermaid syntax into an actual diagram.
 * marked decides what is a code block and what language it is, so all four follow from
 * asking it.
 *
 * A fresh `Marked` instance per call rather than the global `marked.use`, because the
 * renderer closes over this call's mermaid counter — a shared one would leak ids between
 * beats.
 */
export const renderMarkdownContent = (content: string | string[], nextId: () => string): { html: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const md = new Marked({
    async: false,
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        if (languageOf(lang) !== "mermaid") return false;
        hasMermaid = true;
        return mermaidHtml(text, nextId());
      },
    },
  });
  return { html: md.parse(toMarkdownString(content), { async: false }), hasMermaid };
};

/** The object form of `markdown`, as opposed to a plain string or array of lines. */
export const isMarkdownLayout = (md: unknown): md is MulmoMarkdownLayout => typeof md === "object" && md !== null && !Array.isArray(md);

const wrap = (className: string, inner: string): string => `<div class="${className}">${inner}</div>`;

const HEADER = "shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50";
const SIDEBAR = "shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto";
const CELL = "overflow-auto p-4 bg-gray-50 rounded-lg";

/** Lay a markdown layout out in Tailwind: header / sidebar-left / row-2 | 2x2 | content. */
export const renderMarkdownLayout = (md: MulmoMarkdownLayout, nextId: () => string): { html: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const part = (content: string | string[], proseClass: string): string => {
    const rendered = renderMarkdownContent(content, nextId);
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
 * A layout flattened back to plain markdown, in slot order. Used by `mulmo markdown`,
 * which wants what the beat SAYS rather than how it is laid out.
 */
export const layoutToMarkdown = (md: MulmoMarkdownLayout): string => {
  const parts: string[] = [];
  if (md.header) parts.push(toMarkdownString(md.header));
  if (md["sidebar-left"]) parts.push(toMarkdownString(md["sidebar-left"]));
  if ("row-2" in md) {
    parts.push(...md["row-2"].map(toMarkdownString));
  } else if ("2x2" in md) {
    parts.push(...md["2x2"].map(toMarkdownString));
  } else if ("content" in md) {
    parts.push(toMarkdownString(md.content));
  }
  return parts.join("\n\n");
};
