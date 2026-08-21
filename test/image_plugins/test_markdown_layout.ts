import test from "node:test";
import assert from "node:assert";
import { renderMarkdownContent, renderMarkdownLayout, layoutToMarkdown, toMarkdownString } from "../../src/utils/image_plugins/markdown_layout.js";
import { generateMermaidHtml } from "../../src/utils/image_plugins/mermaid.js";
import { mermaidHtml } from "../../src/utils/image_plugins/mermaid_html.js";

/**
 * Characterization tests for the markdown renderer, which is shared by the Node render
 * path (PNG / PDF / movie) and the browser fragment path.
 *
 * The exact bytes are pinned, not just the elements. This renderer had no test of its own
 * when it was one implementation feeding Puppeteer, and the first thing that happened when
 * it was touched was that its indentation changed for every markdown beat — inert, but
 * nobody would have noticed.
 */

const ID = () => "id";

test("layout slots render with their exact markup", () => {
  const { html } = renderMarkdownLayout({ header: "# H", "sidebar-left": "- s", content: "para" }, ID);
  assert.strictEqual(
    html,
    '<div class="w-full h-full flex flex-col overflow-hidden">' +
      '\n    <div class="shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50">' +
      '\n      <div class="prose prose-lg max-w-none"><h1>H</h1>\n</div>' +
      "\n    </div>" +
      '\n  <div class="flex-1 flex min-h-0 overflow-hidden">' +
      '\n    <div class="shrink-0 w-56 px-4 py-4 border-r border-gray-200 bg-gray-100 overflow-auto">' +
      '\n      <div class="prose prose-sm max-w-none"><ul>\n<li>s</li>\n</ul>\n</div>' +
      "\n    </div>" +
      '\n  <div class="flex-1 p-6 overflow-auto">' +
      '<div class="prose max-w-none"><p>para</p>\n</div>' +
      "</div></div></div>",
  );
});

test("row-2 and 2x2 render with their exact markup", () => {
  assert.match(renderMarkdownLayout({ "row-2": ["L", "R"] }, ID).html, /\n {4}<div class="h-full flex gap-6">\n {6}<div class="flex-1 overflow-auto">/);
  assert.match(
    renderMarkdownLayout({ "2x2": ["a", "b", "c", "d"] }, ID).html,
    /\n {4}<div class="h-full grid grid-cols-2 grid-rows-2 gap-4">\n {6}<div class="overflow-auto p-4 bg-gray-50 rounded-lg">/,
  );
  assert.strictEqual((renderMarkdownLayout({ "2x2": ["a", "b", "c", "d"] }, ID).html.match(/rounded-lg/g) ?? []).length, 4);
});

test("an absent slot emits nothing for itself", () => {
  const { html } = renderMarkdownLayout({ content: "only" }, ID);
  assert.ok(!html.includes("border-b border-gray-200"), "no header");
  assert.ok(!html.includes("w-56"), "no sidebar");
});

test("mermaid markup is one implementation, not two", () => {
  // generateMermaidHtml is the Node path's entry point and mermaidHtml is the shared
  // markup; if they ever stop agreeing, one diagram is being drawn two ways.
  assert.strictEqual(generateMermaidHtml("graph TD; A-->B"), mermaidHtml("graph TD; A-->B", "id"));
  assert.strictEqual(generateMermaidHtml("graph TD; A-->B", "T"), mermaidHtml("graph TD; A-->B", "id", "T"));
});

test("a mermaid fence renders the shared markup verbatim", () => {
  // Previously the markup was spliced into the markdown source and marked reflowed it on
  // the way through. It is emitted by the renderer now, so it arrives as written — the
  // .mermaid element is byte-identical either way, which is what mermaid actually reads.
  assert.strictEqual(renderMarkdownContent("```mermaid\ngraph TD; A-->B\n```", ID).html, mermaidHtml("graph TD; A-->B", "id"));
});

test("layoutToMarkdown and toMarkdownString flatten in slot order", () => {
  assert.strictEqual(toMarkdownString(["a", "b"]), "a\nb");
  assert.strictEqual(layoutToMarkdown({ header: "H", "sidebar-left": "S", content: "C" }), "H\n\nS\n\nC");
  assert.strictEqual(layoutToMarkdown({ "row-2": ["L", "R"] }), "L\n\nR");
  assert.strictEqual(layoutToMarkdown({ "2x2": ["a", "b", "c", "d"] }), "a\n\nb\n\nc\n\nd");
});
