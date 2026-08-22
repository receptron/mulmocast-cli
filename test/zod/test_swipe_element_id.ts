import test from "node:test";
import assert from "node:assert";
import { mulmoBeatSchema } from "../../src/types/schema.js";

/**
 * The id reaches an HTML attribute and a CSS selector inside the generated animation
 * script, so the renderer refuses one it cannot use. The schema carries the same rule so an
 * author is told at parse time instead of mid-render — and because the ids it now rejects
 * were already broken: `a'b` produces a JavaScript syntax error in the generated script and
 * `swipe el` produces a selector that silently matches nothing.
 */

const beatWith = (id: string) => ({ image: { type: "html_tailwind", elements: [{ id, text: "x" }] } });

test("a swipe element id outside the permitted set is rejected at parse time", () => {
  ["a'b", "swipe el", '"x"', "0", "-", "第1章", "a.b"].forEach((id) => {
    const result = mulmoBeatSchema.safeParse(beatWith(id));
    assert.strictEqual(result.success, false, `${JSON.stringify(id)} must be rejected`);
  });
});

test("ordinary swipe element ids parse", () => {
  ["panel_2", "a", "_x", "swipe_el_0", "A-1"].forEach((id) => {
    const result = mulmoBeatSchema.safeParse(beatWith(id));
    assert.strictEqual(result.success, true, `${JSON.stringify(id)} must parse: ${JSON.stringify(result.error?.issues?.[0])}`);
  });
});

test("the id stays optional", () => {
  assert.strictEqual(mulmoBeatSchema.safeParse({ image: { type: "html_tailwind", elements: [{ text: "x" }] } }).success, true);
});
