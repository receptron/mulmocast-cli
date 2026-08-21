import test from "node:test";
import assert from "node:assert";
import { textSlideToMarkdown, textSlideToHtml } from "../../src/utils/beat_html/index.js";
import { mulmoTextSlideMediaSchema } from "../../src/types/schema.js";

/** Parsed rather than cast, so a fixture that stopped being a valid textSlide fails here. */
const media = (slide: { title: string; subtitle?: string; bullets?: string[] }) => mulmoTextSlideMediaSchema.parse({ type: "textSlide", slide });

test("textSlideToMarkdown: title becomes h1, subtitle h2, bullets a list", () => {
  assert.strictEqual(textSlideToMarkdown(media({ title: "T", subtitle: "S", bullets: ["a", "b"] })), "# T\n## S\n- a\n- b");
});

test("textSlideToMarkdown: each optional part is simply absent", () => {
  assert.strictEqual(textSlideToMarkdown(media({ title: "T" })), "# T\n");
  assert.strictEqual(textSlideToMarkdown(media({ title: "T", subtitle: "S" })), "# T\n## S\n");
  assert.strictEqual(textSlideToMarkdown(media({ title: "T", bullets: ["a"] })), "# T\n- a");
  // An empty bullets array must read the same as no bullets at all.
  assert.strictEqual(textSlideToMarkdown(media({ title: "T", bullets: [] })), "# T\n");
});

test("textSlideToMarkdown: an empty title drops the heading rather than emitting a bare #", () => {
  assert.strictEqual(textSlideToMarkdown(media({ title: "", bullets: ["a"] })), "- a");
});

test("textSlideToHtml: returns rendered markup synchronously", () => {
  const { html } = textSlideToHtml(media({ title: "Hello", subtitle: "World", bullets: ["one", "two"] }));
  // Synchronous, not a promise — a browser host renders a beat in a computed property.
  assert.strictEqual(typeof html, "string");
  assert.match(html, /<h1[^>]*>Hello<\/h1>/);
  assert.match(html, /<h2[^>]*>World<\/h2>/);
  assert.match(html, /<li>one<\/li>[\s\S]*<li>two<\/li>/);
});

test("textSlideToHtml: emits no document scaffolding and no shared assets", () => {
  const { html, css, requires } = textSlideToHtml(media({ title: "T", bullets: ["a"] }));
  ["<!DOCTYPE", "<html", "<head", "<body", "<script", "cdn."].forEach((needle) => assert.ok(!html.includes(needle), `a fragment must not carry ${needle}`));
  // A textSlide is plain markdown: no rules of its own, no runtime for the host to load.
  assert.strictEqual(css, undefined);
  assert.strictEqual(requires, undefined);
});

test("textSlideToHtml: markdown inside the text is rendered, not escaped away", () => {
  // The bullets are markdown by design — the existing markdown / html actions rely on it.
  const { html } = textSlideToHtml(media({ title: "T", bullets: ["**bold**", "`code`"] }));
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
});
