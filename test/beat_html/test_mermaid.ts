import test from "node:test";
import assert from "node:assert";
import { mermaidToHtml } from "../../src/utils/beat_html/mermaid.js";
import { mermaidHtml } from "../../src/utils/image_plugins/mermaid_html.js";
import { mulmoMermaidMediaSchema } from "../../src/types/schema.js";

/**
 * Verified in a browser: the fragment injected through `innerHTML`, a host loading mermaid
 * from `requires` and calling `mermaid.init` on `.mermaid` elements. The diagram drew and a
 * hostile title produced no element.
 */

const media = (over: Record<string, unknown> = {}) =>
  mulmoMermaidMediaSchema.parse({ type: "mermaid", title: "Flow", code: { kind: "text", text: "graph TD; A-->B" }, ...over });

test("a text diagram renders and asks the host for the mermaid runtime", () => {
  const fragment = mermaidToHtml(media(), "beat-0");
  assert.ok(fragment);
  assert.deepStrictEqual(fragment.requires, ["mermaid"]);
  assert.match(fragment.html, /<div id="beat-0-mermaid" class="mermaid">/);
  assert.match(fragment.html, /graph TD; A--&gt;B/, "the source is escaped for its text context");
});

// getText fetches and reads files, so these cannot be reached from a browser. The module
// returns undefined rather than inventing a placeholder — the caller decides what to show.
test("code kinds that need the filesystem or network render nothing", () => {
  [
    { kind: "url", url: "https://example.com/d.mmd" },
    { kind: "path", path: "d.mmd" },
    { kind: "base64", data: "Z3JhcGggVEQ7" },
  ].forEach((code) => {
    assert.strictEqual(mermaidToHtml(media({ code }), "b"), undefined, `${code.kind} must render nothing`);
  });
});

test("the appendix is appended to the diagram source, as the document path does", () => {
  const appendix = ["style A fill:#f9f", "style B fill:#bbf"];
  const fragment = mermaidToHtml(media({ appendix }), "b");
  assert.ok(fragment);
  // The document path builds `${code}\n${appendix.join("\n")}`.trim() and hands the whole
  // thing to the same renderer, so only the first line carries the template's indentation.
  assert.strictEqual(fragment.html, mermaidHtml(`graph TD; A-->B\n${appendix.join("\n")}`, "b-mermaid", "Flow"));
  assert.match(fragment.html, /graph TD; A--&gt;B\nstyle A fill:#f9f\nstyle B fill:#bbf/);
});

test("an empty title falls back to Diagram, matching the document path", () => {
  const fragment = mermaidToHtml(media({ title: "" }), "b");
  assert.ok(fragment);
  assert.match(fragment.html, /<h3 class="text-xl font-semibold mb-4">Diagram<\/h3>/);
});

test("a hostile title and hostile source cannot escape their contexts", () => {
  const fragment = mermaidToHtml(
    media({ title: '</h3><img src=x onerror="pwn()">', code: { kind: "text", text: 'graph TD; A-->B;</DIV ><img src=x onerror="pwn()">' } }),
    "b",
  );
  assert.ok(fragment);
  const lower = fragment.html.toLowerCase();
  assert.strictEqual(lower.split("<img").length - 1, 0, "no injected element may survive");
  assert.strictEqual(lower.split("<h3").length - 1, 1, "the heading must not be closed early");
  assert.strictEqual(lower.split("</div").length - 1, 3, "the containers must not be closed early");
});

test("the id goes through the element id rule", () => {
  assert.throws(() => mermaidToHtml(media(), "beat 1"), /element id must match/);
});

// One implementation, two callers. If they drift, the browser and the PNG show different
// diagrams for the same beat.
test("the fragment is the shared markup, not a second copy", () => {
  const image = media();
  const fragment = mermaidToHtml(image, "beat-9");
  assert.ok(fragment);
  assert.strictEqual(fragment.html, mermaidHtml("graph TD; A-->B", "beat-9-mermaid", "Flow"));
});
