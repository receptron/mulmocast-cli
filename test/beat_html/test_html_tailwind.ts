import test from "node:test";
import assert from "node:assert";
import { htmlTailwindToHtml } from "../../src/utils/beat_html/html_tailwind.js";
import { requireImagePlugin } from "../image_plugins/utils.js";
import { mulmoHtmlTailwindMediaSchema } from "../../src/types/schema.js";

/**
 * This beat type is where "the markup is not sanitized" matters most: the author's html IS
 * the content and the schema also accepts a `script`, so escaping it would remove the
 * feature rather than a capability the author lacks.
 */

const media = (over: Record<string, unknown>) => mulmoHtmlTailwindMediaSchema.parse({ type: "html_tailwind", ...over });

test("the author's html is emitted as written", () => {
  assert.strictEqual(htmlTailwindToHtml(media({ html: "<div>a</div>" }))!.html, "<div>a</div>");
  assert.strictEqual(htmlTailwindToHtml(media({ html: ["<div>a</div>", "<div>b</div>"] }))!.html, "<div>a</div>\n<div>b</div>");
});

test("swipe elements win over html, and render at rest", () => {
  const fragment = htmlTailwindToHtml(media({ html: "<div>ignored</div>", elements: [{ id: "panel_1", text: "x" }] }));
  assert.ok(fragment);
  assert.match(fragment.html, /<div id="panel_1"/);
  assert.ok(!fragment.html.includes("ignored"), "elements take precedence");
});

// The animation driver, the author's script and the frame-based animation all need script
// execution, which a fragment injected through innerHTML cannot do.
test("no script is emitted, whatever the beat asks for", () => {
  [{ html: "<div>a</div>", script: "alert(1)" }, { elements: [{ id: "a", text: "x", to: { opacity: 1 } }] }, { html: "<div>a</div>", animation: true }].forEach(
    (over) => {
      const fragment = htmlTailwindToHtml(media(over));
      assert.strictEqual((fragment?.html ?? "").toLowerCase().split("<script").length - 1, 0, `${JSON.stringify(over)} must emit no script`);
    },
  );
});

test("nothing to show renders nothing, rather than an empty element", () => {
  [{}, { html: "" }, { html: [] }, { elements: [] }, { script: "alert(1)" }].forEach((over) => {
    assert.strictEqual(htmlTailwindToHtml(media(over)), undefined, `${JSON.stringify(over)} must render nothing`);
  });
});

// Two layers, and the schema is the earlier one — that is what #1541 added it for.
test("a bad swipe element id is refused at parse time", () => {
  assert.throws(() => media({ elements: [{ id: "bad id", text: "x" }] }), /must start with a letter or underscore/);
});

test("and refused again at render time, for a caller that did not parse", () => {
  assert.throws(() => htmlTailwindToHtml({ type: "html_tailwind", elements: [{ id: "bad id", text: "x" }] }), /element id must match/);
});

// A caller that skipped zod. Every one of these is rejected at parse time, so this is not a
// path the pipeline reaches — but the guard decides what happens when someone bypasses it,
// and before this PR `[null]` threw and `["str"]` rendered garbage from a string.
test("elements that are not an array of objects fall back to html", () => {
  const unparsed = (elements: unknown) => htmlTailwindToHtml({ type: "html_tailwind", elements, html: "<div>fallback</div>" });
  ["not-an-array", 7, {}, null, [null], ["str"], [undefined]].forEach((elements) => {
    assert.strictEqual(unparsed(elements)?.html, "<div>fallback</div>", `${JSON.stringify(elements)} must fall back`);
  });
});

// One implementation, two callers: if they drift, the browser and the PNG dump disagree.
test("the fragment is the same markup the document dump produces", async () => {
  const plugin = requireImagePlugin("html_tailwind");
  for (const over of [{ html: "<div>a</div>" }, { html: ["a", "b"] }, { elements: [{ id: "p", text: "x" }] }]) {
    const image = media(over);
    assert.strictEqual(htmlTailwindToHtml(image)!.html, await plugin.html!({ beat: { image } }), JSON.stringify(over));
  }
});
