import test from "node:test";
import assert from "node:assert";
import { mermaidToHtml } from "../../src/utils/beat_html/mermaid.js";
import { beatToHtml } from "../../src/utils/beat_html/index.js";
import { generateSlideFragment } from "@mulmocast/deck/lib/fragment.js";
import { slideThemes } from "../../src/data/slideThemes.js";
import { mulmoMermaidMediaSchema } from "../../src/types/schema.js";

/**
 * A mermaid beat is drawn by `@mulmocast/deck` as a one-block `figure` slide. What these pin
 * is the mapping onto that slide and onto BeatHtmlFragment — the slide markup is deck's to test.
 */

const media = (over: Record<string, unknown> = {}) =>
  mulmoMermaidMediaSchema.parse({ type: "mermaid", title: "Flow", code: { kind: "text", text: "graph TD; A-->B" }, ...over });
const options = (over: Record<string, unknown> = {}) => ({ idPrefix: "beat-0", ...over });
const figure = (title: string, code: string) =>
  generateSlideFragment(slideThemes.corporate, { layout: "figure", title, figure: { type: "mermaid", code } }, { scopeClass: "beat-0-slide" });

test("the fragment is deck's figure slide holding the diagram", () => {
  const fragment = mermaidToHtml(media(), options());
  assert.ok(fragment);
  const theirs = figure("Flow", "graph TD; A-->B");
  assert.strictEqual(fragment.html, theirs.html);
  assert.strictEqual(fragment.css, theirs.css);
  assert.match(fragment.html, /<div id="beat-0-slide-mermaid-0" class="mermaid">graph TD; A--&gt;B<\/div>/);
});

test("the host is told to load mermaid, and with which theme", () => {
  const light = mermaidToHtml(media(), options());
  const dark = mermaidToHtml(media(), options({ slideTheme: slideThemes.dark }));
  assert.deepStrictEqual(light?.requires, ["mermaid"]);
  assert.strictEqual(light?.mermaidTheme, "default");
  assert.strictEqual(dark?.mermaidTheme, "dark");
});

// getText fetches and reads files, so these cannot be reached from a browser. The module
// returns undefined rather than inventing a placeholder — the caller decides what to show.
test("code kinds that need the filesystem or network render nothing", () => {
  [
    { kind: "url", url: "https://example.com/d.mmd" },
    { kind: "path", path: "d.mmd" },
    { kind: "base64", data: "Z3JhcGggVEQ7" },
  ].forEach((code) => {
    assert.strictEqual(mermaidToHtml(media({ code }), options()), undefined, `${code.kind} must render nothing`);
  });
});

test("the appendix is appended to the diagram source, as the document path does", () => {
  const appendix = ["style A fill:#f9f", "style B fill:#bbf"];
  const fragment = mermaidToHtml(media({ appendix }), options());
  assert.ok(fragment);
  assert.strictEqual(fragment.html, figure("Flow", `graph TD; A-->B\n${appendix.join("\n")}`).html);
});

test("an empty title falls back to Diagram, matching the document path", () => {
  const fragment = mermaidToHtml(media({ title: "" }), options());
  assert.ok(fragment);
  assert.strictEqual(fragment.html, figure("Diagram", "graph TD; A-->B").html);
});

test("the same beat renders the same markup every time", () => {
  assert.strictEqual(mermaidToHtml(media(), options())?.html, mermaidToHtml(media(), options())?.html);
});

test("a hostile title and hostile source cannot escape their contexts", () => {
  const fragment = mermaidToHtml(
    media({ title: '</h2><img src=x onerror="pwn()">', code: { kind: "text", text: 'graph TD; A-->B;</DIV ><img src=x onerror="pwn()">' } }),
    options(),
  );
  assert.ok(fragment);
  const lower = fragment.html.toLowerCase();
  assert.strictEqual(lower.split("<img").length - 1, 0, "no injected element may survive");
  assert.strictEqual(lower.split("<h2").length - 1, 1, "the heading must not be closed early");
  assert.strictEqual(lower.split("<div").length, lower.split("</div").length, "the containers must not be closed early");
});

test("the id prefix goes through the element id rule", () => {
  assert.throws(() => beatToHtml({ text: "", image: media() }, options({ idPrefix: "beat 1" })), /element id must match/);
});
