import test from "node:test";
import assert from "node:assert";
import { swipeElementsToHtml, swipeElementsToScript, type SwipeElement } from "../../src/utils/swipe_to_html.js";

/**
 * A swipe element's id reaches an HTML attribute AND a raw CSS selector inside a JavaScript
 * string literal in the generated script, so it goes through the same permitted-set rule as
 * every other element id. Escaping the attribute alone would leave the selector wrong.
 *
 * This is not a privilege boundary — `html_tailwind` accepts an author's own `script` by
 * design — but a quote in an id otherwise produces broken JavaScript with no diagnostic.
 */

const withId = (id: string): SwipeElement[] => [{ id, text: "x", to: { opacity: 1 } }];

test("an element id outside the permitted set is rejected by both generators", () => {
  ["a'b", '"x"', "a b", "0", "-", "第1章"].forEach((id) => {
    assert.throws(() => swipeElementsToHtml(withId(id)), /element id must match/, `html: ${JSON.stringify(id)}`);
    assert.throws(() => swipeElementsToScript(withId(id)), /element id must match/, `script: ${JSON.stringify(id)}`);
  });
});

test("the default id and ordinary ids are accepted, and reach both outputs", () => {
  const html = swipeElementsToHtml(withId("panel_2"));
  assert.match(html, /<div id="panel_2"/);
  assert.match(swipeElementsToScript(withId("panel_2")), /animation\.animate\('#panel_2'/);
});

test("elements without an id get a generated one that satisfies the rule", () => {
  const elements: SwipeElement[] = [{ text: "x", to: { opacity: 1 } }];
  assert.match(swipeElementsToHtml(elements), /<div id="swipe_el_0"/);
  assert.match(swipeElementsToScript(elements), /animation\.animate\('#swipe_el_0'/);
});
