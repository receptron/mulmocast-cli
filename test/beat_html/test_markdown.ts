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
  // Mermaid entity-decodes the element's innerHTML, so `--&gt;` reaches it as `-->`; the
  // is ordinary HTML. `image_plugins/mermaid.ts` interpolates the code the same way, so
  // the two paths render a diagram identically — which is the point of sharing
  // mermaid_html.ts, shared by both paths. It also means a diagram containing `</div>` would break out of the
  // element, which is the unsanitized contract on BeatHtmlFragment.html, not a new hole.
  // Escaped for its HTML text context. Mermaid entity-decodes the element's innerHTML before
  // parsing, so the diagram it draws is unchanged — measured byte-identical SVG.
  assert.match(html, /graph TD; A--&gt;B/, "the diagram source survives into the element");
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
  assert.strictEqual(beatToHtml(beat, { idPrefix: "b7" })?.html, beatToHtml(beat, { idPrefix: "b7" })?.html);
});

test("two beats cannot be rendered into the same ids by omission", () => {
  // The first design defaulted idPrefix, and two markdown beats then both emitted
  // `id="…-mermaid-0"` — invalid HTML, and mermaid initialising against whichever element
  // it found first. There is no value a library can pick that is unique per beat AND
  // stable across re-renders, so the caller has to say. This asserts the API still makes
  // that unavoidable: `idPrefix` is required, so there is no way to omit it.
  const beat = mulmoBeatSchema.parse({ image: { type: "markdown", markdown: "```mermaid\ngraph TD; A-->B\n```" } });
  const idsOf = (html: string) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const a = idsOf(beatToHtml(beat, { idPrefix: "beat-0" })?.html ?? "");
  const b = idsOf(beatToHtml(beat, { idPrefix: "beat-1" })?.html ?? "");
  assert.deepStrictEqual(a, ["beat-0-mermaid-0"]);
  assert.deepStrictEqual(b, ["beat-1-mermaid-0"]);
  assert.strictEqual(a.filter((id) => b.includes(id)).length, 0, "two beats must not share an element id");
});

// ═══════════════════════════════════════════════════════════
// What counts as a mermaid fence.
//
// The first version matched ```` ```mermaid ```` against the raw source with a regex and
// review found four inputs it got wrong. marked's own lexer decides now — these are the
// cases that distinguish the two, both directions.
// ═══════════════════════════════════════════════════════════

test("a fence is a diagram when marked says it is a mermaid code block", () => {
  const isDiagram = (src: string) => {
    const { html, requires } = markdownToHtml(media(src), "p");
    const inMarkup = html.includes('class="mermaid"');
    // requires and the markup come from one decision; if they ever disagree, the host
    // either loads a runtime for nothing or renders a diagram as an empty box.
    assert.strictEqual(inMarkup, requires?.includes("mermaid") ?? false, `requires disagrees with the markup for: ${src}`);
    return inMarkup;
  };

  assert.ok(isDiagram("```mermaid\ngraph TD; A-->B\n```"), "plain fence");
  assert.ok(isDiagram("```mermaid\r\ngraph TD; A-->B\r\n```"), "CRLF line endings");
  assert.ok(isDiagram("```mermaid \ngraph TD; A-->B\n```"), "trailing space after the language");
  assert.ok(isDiagram('```mermaid title="x"\ngraph TD; A-->B\n```'), "an info string after the language");
  assert.ok(isDiagram("```MERMAID\ngraph TD; A-->B\n```"), "language matched case-insensitively");

  assert.ok(!isDiagram("````markdown\n```mermaid\ngraph TD; A-->B\n```\n````"), "quoted inside an outer fence");
  assert.ok(!isDiagram("    ```mermaid\n    graph TD; A-->B\n    ```"), "inside an indented code block");
  assert.ok(!isDiagram("```ts\nconst a = 1;\n```"), "a different language");
  assert.ok(!isDiagram("no fence here at all"), "no fence");
});

// ═══════════════════════════════════════════════════════════
// One implementation, not two.
//
// The rendering lives in `image_plugins/markdown_layout.ts` and both paths call it: the
// Node path to make a PNG, this one to hand markup to a browser host. There was briefly a
// second copy here, and the two immediately disagreed about which fences are diagrams —
// while a test asserting they matched passed, because they agreed on being wrong.
//
// So this does not compare two renderers. It checks that there is still only one: if
// somebody forks the implementation again, these go red.
// ═══════════════════════════════════════════════════════════

test("the Node path and the browser path render byte-identical markup", async () => {
  const { renderMarkdownContent, renderMarkdownLayout } = await import("../../src/utils/image_plugins/markdown_layout.js");
  // Ids are the one thing the two callers supply differently — random for a
  // render-once-to-PNG path, deterministic for one that re-renders — so normalise them.
  const sameIds = (html: string) => html.replace(/id="[^"]*"/g, 'id="ID"');

  const textCases = [
    "# T\n\n- a\n- b",
    "```mermaid\ngraph TD; A-->B\n```",
    "```mermaid\r\ngraph TD; A-->B\r\n```",
    "````markdown\n```mermaid\ngraph TD; A-->B\n```\n````",
    "    ```mermaid\n    graph TD; A-->B\n    ```",
    "| a | b |\n|---|---|\n| 1 | 2 |",
  ];
  textCases.forEach((src) => {
    const node = renderMarkdownContent(src, () => "ID").html;
    assert.strictEqual(sameIds(markdownToHtml(media(src), "p").html), node, `text: ${JSON.stringify(src)}`);
  });

  const layoutCases = [
    { content: "para" },
    { header: "# H", "sidebar-left": "- s", content: "para" },
    { "row-2": ["L", "R"] },
    { "2x2": ["a", "b", "c", "d"] },
    { content: "```mermaid\ngraph TD; A-->B\n```" },
  ];
  layoutCases.forEach((layout) => {
    const node = renderMarkdownLayout(layout as never, () => "ID").html;
    assert.strictEqual(sameIds(markdownToHtml(media(layout), "p").html), node, `layout: ${JSON.stringify(layout)}`);
  });
});

test("the identity check can actually tell two renderings apart", async () => {
  // Normalising ids could also normalise away a real difference. It does not: two
  // different layouts still compare unequal.
  const { renderMarkdownLayout } = await import("../../src/utils/image_plugins/markdown_layout.js");
  const a = renderMarkdownLayout({ content: "para" } as never, () => "ID").html;
  const b = renderMarkdownLayout({ header: "# H", content: "para" } as never, () => "ID").html;
  assert.notStrictEqual(a, b);
});
