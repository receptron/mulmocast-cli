import test from "node:test";
import assert from "node:assert";
import { beatToHtml, supportedBeatTypes } from "../../src/utils/beat_html/index.js";
import { mulmoBeatSchema } from "../../src/types/schema.js";

/** Every fixture goes through the schema, so none of them can drift into an invalid shape. */
const beat = (image: unknown) => mulmoBeatSchema.parse({ image });

/** A minimal beat per supported type, so the dispatcher can be exercised for each. */
const minimalBeat: Record<(typeof supportedBeatTypes)[number], ReturnType<typeof beat>> = {
  textSlide: beat({ type: "textSlide", slide: { title: "T" } }),
  markdown: beat({ type: "markdown", markdown: "# T" }),
  chart: beat({ type: "chart", title: "T", chartData: { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } } }),
  mermaid: beat({ type: "mermaid", title: "T", code: { kind: "text", text: "graph TD; A-->B" } }),
  image: beat({ type: "image", source: { kind: "url", url: "https://example.com/a.png" } }),
  movie: beat({ type: "movie", source: { kind: "url", url: "https://example.com/a.mp4" } }),
};

test("every type in supportedBeatTypes actually renders", () => {
  supportedBeatTypes.forEach((type) => {
    const fragment = beatToHtml(minimalBeat[type], { idPrefix: "t" });
    assert.ok(fragment, `${type} is listed as supported but beatToHtml returned undefined`);
    assert.ok(fragment.html.length > 0, `${type} rendered empty markup`);
  });
});

test("types not on the list render nothing, rather than something wrong", () => {
  // The list and the dispatcher are separate declarations; this is what keeps them honest.
  // As each of these lands in a later PR it moves into supportedBeatTypes and out of here.
  // Real beats, not stubs: a stub could fail to render for the wrong reason.
  const notYetSupported: [string, unknown][] = [
    ["html_tailwind", { type: "html_tailwind", html: "<div></div>" }],
    ["slide", { type: "slide", slide: { layout: "title", title: "T" } }],
    ["beat", { type: "beat" }],
  ];
  notYetSupported.forEach(([type, image]) => {
    assert.ok(!supportedBeatTypes.some((t) => t === type), `${type} is on supportedBeatTypes — move it out of this list and give it a minimal beat`);
    assert.strictEqual(beatToHtml(beat(image), { idPrefix: "t" }), undefined, `${type} should not render yet`);
  });
});

test("a beat with no image renders nothing", () => {
  assert.strictEqual(beatToHtml(mulmoBeatSchema.parse({ text: "narration only" }), { idPrefix: "t" }), undefined);
});
