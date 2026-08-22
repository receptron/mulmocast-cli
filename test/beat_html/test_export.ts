import test from "node:test";
import assert from "node:assert";
import { beatToHtml, supportedBeatTypes } from "../../src/index.browser.js";
import { mulmoBeatSchema } from "../../src/types/schema.js";

/**
 * What `mulmocast/browser` promises. The unit tests for each beat type live beside it; this
 * one exists so the export itself cannot be removed or renamed silently.
 *
 * Verified in a real browser through this entry point: all eight types rendered, Chart.js
 * drew its canvas, mermaid produced two SVGs, and `#app` contained no <script>.
 */

const sample: Record<string, unknown> = {
  textSlide: { type: "textSlide", slide: { title: "T" } },
  markdown: { type: "markdown", markdown: "# T" },
  chart: { type: "chart", title: "T", chartData: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } } },
  mermaid: { type: "mermaid", title: "T", code: { kind: "text", text: "graph TD; A-->B" } },
  image: { type: "image", source: { kind: "url", url: "https://example.com/a.png" } },
  movie: { type: "movie", source: { kind: "url", url: "https://example.com/a.mp4" } },
  // A chart block on purpose: it is the shape that carried an inline driver before deck 2.0.0,
  // so the no-script assertion below is checked against the case that used to violate it.
  slide: { type: "slide", slide: { layout: "split", title: "T", left: { content: [{ type: "chart", chartData: { type: "bar" } }] }, right: { content: [] } } },
  html_tailwind: { type: "html_tailwind", html: "<div>T</div>" },
};

test("the browser entry point exports beatToHtml and its supported types", () => {
  assert.strictEqual(typeof beatToHtml, "function");
  assert.deepStrictEqual([...supportedBeatTypes].sort(), Object.keys(sample).sort(), "the list and the samples must not drift apart");
});

test("every exported type renders through the public entry point", () => {
  supportedBeatTypes.forEach((type, index) => {
    const beat = mulmoBeatSchema.parse({ description: "d", image: sample[type] });
    const fragment = beatToHtml(beat, { idPrefix: `beat-${index}` });
    assert.ok(fragment, `${type} must render`);
    assert.ok(fragment.html.length > 0, `${type} must produce markup`);
    assert.ok(!fragment.html.toLowerCase().includes("<script"), `${type} must not carry a script — an injected one does not execute`);
  });
});

test("the host is told which runtimes the whole page needs", () => {
  const requires = supportedBeatTypes.flatMap(
    (type, index) => beatToHtml(mulmoBeatSchema.parse({ image: sample[type] }), { idPrefix: `b-${index}` })?.requires ?? [],
  );
  assert.ok(requires.includes("chart"), "the chart beat asks for Chart.js");
  assert.ok(requires.includes("mermaid"), "the mermaid beat asks for mermaid");
});

test("the id rule applies at the public boundary too", () => {
  assert.throws(() => beatToHtml(mulmoBeatSchema.parse({ image: sample.textSlide }), { idPrefix: "beat 1" }), /element id must match/);
});
