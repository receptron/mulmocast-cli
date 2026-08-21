import test from "node:test";
import assert from "node:assert";
import { markdownToHtml, beatToHtml } from "../../src/utils/beat_html/index.js";
import { mulmoMarkdownMediaSchema, mulmoBeatSchema } from "../../src/types/schema.js";

/** Parsed rather than cast, so a fixture that stopped being valid markdown media fails here. */
const media = (markdown: unknown) => mulmoMarkdownMediaSchema.parse({ type: "markdown", markdown });

test("text form: a string and an array of lines mean the same thing", () => {
  const fromString = markdownToHtml(media("# T\n\n- a\n- b"), "p").html;
  const fromLines = markdownToHtml(media(["# T", "", "- a", "- b"]), "p").html;
  assert.strictEqual(fromString, fromLines, "an array of lines is joined with newlines, nothing more");
  assert.match(fromString, /<h1[^>]*>T<\/h1>/);
  assert.match(fromString, /<li>a<\/li>/);
});

test("text form: no mermaid means no runtime for the host to load", () => {
  assert.strictEqual(markdownToHtml(media("# T"), "p").requires, undefined);
});

// ═══════════════════════════════════════════════════════════
// A markdown beat can embed a diagram. Nothing about the beat type says so, which is
// exactly why it is worth pinning: a host that only loads mermaid for `mermaid` beats
// would render the diagram as an empty box.
// ═══════════════════════════════════════════════════════════

test("a mermaid fence turns into mermaid markup and requires the runtime", () => {
  const { html, requires } = markdownToHtml(media("# T\n\n```mermaid\ngraph TD; A-->B\n```"), "p");
  assert.deepStrictEqual(requires, ["mermaid"], "the host has to be told to load mermaid");
  assert.match(html, /class="mermaid"/);
  // Unescaped, because mermaid reads the element's textContent and `-->` in a text node
  // is ordinary HTML. `image_plugins/mermaid.ts` interpolates the code the same way, so
  // the two paths render a diagram identically — which is the point of sharing
  // mermaidBlockHtml. It also means a diagram containing `</div>` would break out of the
  // element, which is the unsanitized contract on BeatHtmlFragment.html, not a new hole.
  assert.match(html, /graph TD; A-->B/, "the diagram source survives into the element");
  assert.ok(!html.includes("<code"), "the fence must not render as a code block");
});

test("mermaid ids are stable across renders and unique within a beat", () => {
  const source = "```mermaid\ngraph TD; A-->B\n```\n\n```mermaid\ngraph TD; C-->D\n```";
  const first = markdownToHtml(media(source), "beat-3").html;
  const second = markdownToHtml(media(source), "beat-3").html;
  assert.strictEqual(first, second, "the same beat rendered twice must produce the same markup");

  const ids = [...first.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(ids, ["beat-3-mermaid-0", "beat-3-mermaid-1"]);
  // A different beat must not collide with this one on the page.
  const other = markdownToHtml(media(source), "beat-4").html;
  assert.ok(!other.includes("beat-3-mermaid-0"));
});

// ═══════════════════════════════════════════════════════════
// Object (layout) form.
// ═══════════════════════════════════════════════════════════

test("layout form: header, sidebar and content each render into their own slot", () => {
  const { html } = markdownToHtml(media({ header: "# H", "sidebar-left": "- s", content: "para" }), "p");
  assert.match(html, /border-b border-gray-200/, "header slot");
  assert.match(html, /w-56[^"]*border-r/, "sidebar slot");
  assert.match(html, /<h1[^>]*>H<\/h1>/);
  assert.match(html, /<li>s<\/li>/);
  assert.match(html, /<p>para<\/p>/);
});

test("layout form: row-2 and 2x2 render the right number of cells", () => {
  const row2 = markdownToHtml(media({ "row-2": ["L", "R"] }), "p").html;
  assert.match(row2, /h-full flex gap-6/);
  assert.strictEqual((row2.match(/flex-1 overflow-auto/g) ?? []).length, 2);

  const grid = markdownToHtml(media({ "2x2": ["a", "b", "c", "d"] }), "p").html;
  assert.match(grid, /grid-cols-2 grid-rows-2/);
  assert.strictEqual((grid.match(/bg-gray-50 rounded-lg/g) ?? []).length, 4);
  ["a", "b", "c", "d"].forEach((cell) => assert.match(grid, new RegExp(`<p>${cell}</p>`)));
});

test("layout form: a mermaid fence anywhere in a slot still requires the runtime", () => {
  // The fence is in a grid cell rather than at the top level — the slot walk has to
  // report upward, or the requirement is lost in a nested layout.
  const { requires } = markdownToHtml(media({ "2x2": ["a", "```mermaid\ngraph TD; A-->B\n```", "c", "d"] }), "p");
  assert.deepStrictEqual(requires, ["mermaid"]);
});

test("layout form: absent slots produce no empty markup for them", () => {
  const { html } = markdownToHtml(media({ content: "only" }), "p");
  assert.ok(!html.includes("border-b border-gray-200"), "no header slot");
  assert.ok(!html.includes("w-56"), "no sidebar slot");
});

// ═══════════════════════════════════════════════════════════
// The fragment contract, same as every other beat type.
// ═══════════════════════════════════════════════════════════

test("markdown emits no document scaffolding and no shared assets", () => {
  const { html } = markdownToHtml(media({ header: "# H", content: "```mermaid\ngraph TD; A-->B\n```" }), "p");
  ["<!DOCTYPE", "<html", "<head", "<body", "<script", "cdn."].forEach((needle) => assert.ok(!html.includes(needle), `a fragment must not carry ${needle}`));
});

test("beatToHtml routes a markdown beat and passes the id prefix through", () => {
  const beat = mulmoBeatSchema.parse({ image: { type: "markdown", markdown: "```mermaid\ngraph TD; A-->B\n```" } });
  assert.match(beatToHtml(beat, { idPrefix: "b7" })?.html ?? "", /id="b7-mermaid-0"/);
  // Without a prefix the output still has to be deterministic.
  assert.strictEqual(beatToHtml(beat)?.html, beatToHtml(beat)?.html);
});

// ═══════════════════════════════════════════════════════════
// Parity with the Node path.
//
// `image_plugins/markdown.ts` renders the same beat for PDF / movie output. Two
// implementations of one thing drift, and PR 10 is where they are meant to become one —
// this is what tells us they have not diverged before then. Whitespace differs by
// construction (the Node version formats its template literals across lines), so the
// comparison collapses it; everything else has to match.
// ═══════════════════════════════════════════════════════════

test("renders the same markup as the Node plugin, for both formats", async () => {
  const { generateLayoutHtml, parseMarkdown } = await import("../../src/utils/image_plugins/markdown_layout.js");
  const collapse = (html: string) => html.replace(/\s+/g, " ").replace(/> </g, "><").trim();

  const textCases = ["# T\n\n- a\n- b", "plain", "**bold** and `code`"];
  await Promise.all(
    textCases.map(async (md) => {
      const mine = markdownToHtml(media(md), "p").html;
      assert.strictEqual(collapse(mine), collapse(await parseMarkdown(md)), `text form: ${md}`);
    }),
  );

  const layoutCases = [
    { content: "para" },
    { header: "# H", "sidebar-left": "- s", content: "para" },
    { "row-2": ["L", "R"] },
    { "2x2": ["a", "b", "c", "d"] },
    { header: "# H", "row-2": ["L", "R"] },
  ];
  await Promise.all(
    layoutCases.map(async (layout) => {
      const mine = markdownToHtml(media(layout), "p").html;
      const theirs = await generateLayoutHtml(layout as never);
      assert.strictEqual(collapse(mine), collapse(theirs), `layout form: ${JSON.stringify(layout)}`);
    }),
  );
});

test("the parity check can actually tell the two apart", () => {
  // A comparison that collapses whitespace could also collapse a real difference into
  // nothing. It does not: changing one slot's classes shows up.
  const collapse = (html: string) => html.replace(/\s+/g, " ").replace(/> </g, "><").trim();
  const a = markdownToHtml(media({ content: "para" }), "p").html;
  const b = markdownToHtml(media({ header: "# H", content: "para" }), "p").html;
  assert.notStrictEqual(collapse(a), collapse(b));
});
