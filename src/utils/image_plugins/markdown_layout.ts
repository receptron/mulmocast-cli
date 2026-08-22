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

/**
 * The slot markup is main's, verbatim including its indentation. Reformatting it would
 * change every rendered markdown beat's HTML for no reason — semantically inert, but this
 * feeds Puppeteer and the `mulmo html` export, and "no behaviour change" should mean the
 * bytes too.
 */
const HEADER_HTML = (inner: string): string => `
    <div class="shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50">
      <div class="prose prose-lg max-w-none">${inner}</div>
    </div>
  `;

const SIDEBAR_HTML = (inner: string): string => `
    <div class="shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto">
      <div class="prose prose-sm max-w-none">${inner}</div>
    </div>
  `;

const ROW2_HTML = (left: string, right: string): string => `
    <div class="h-full flex gap-6">
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${left}</div>
      </div>
      <div class="flex-1 overflow-auto">
        <div class="prose max-w-none">${right}</div>
      </div>
    </div>
  `;

const GRID_2X2_HTML = (cells: string[]): string => `
    <div class="h-full grid grid-cols-2 grid-rows-2 gap-4">
${cells
  .map(
    (cell) => `      <div class="overflow-auto p-4 bg-gray-50 rounded-lg">
        <div class="prose prose-sm max-w-none">${cell}</div>
      </div>`,
  )
  .join("\n")}
    </div>
  `;

const CONTENT_HTML = (inner: string): string => `<div class="prose max-w-none">${inner}</div>`;

/** Lay a markdown layout out in Tailwind: header / sidebar-left / row-2 | 2x2 | content. */
export const renderMarkdownLayout = (md: MulmoMarkdownLayout, nextId: () => string): { html: string; hasMermaid: boolean } => {
  let hasMermaid = false;
  const render = (content: string | string[]): string => {
    const rendered = renderMarkdownContent(content, nextId);
    hasMermaid = hasMermaid || rendered.hasMermaid;
    return rendered.html;
  };

  const parts: string[] = ['<div class="w-full h-full flex flex-col overflow-hidden">'];
  if (md.header) parts.push(HEADER_HTML(render(md.header)));
  parts.push('<div class="flex-1 flex min-h-0 overflow-hidden">');
  if (md["sidebar-left"]) parts.push(SIDEBAR_HTML(render(md["sidebar-left"])));
  parts.push('<div class="flex-1 p-6 overflow-auto">');

  if ("row-2" in md) {
    const [left, right] = md["row-2"] satisfies MulmoRow2;
    parts.push(ROW2_HTML(render(left), render(right)));
  } else if ("2x2" in md) {
    parts.push(GRID_2X2_HTML((md["2x2"] satisfies MulmoGrid2x2).map(render)));
  } else if ("content" in md) {
    parts.push(CONTENT_HTML(render(md.content)));
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
