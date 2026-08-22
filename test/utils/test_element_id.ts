import test from "node:test";
import assert from "node:assert";
import { assertSafeElementId, isSafeElementId } from "../../src/utils/element_id.js";

test("the permitted set is letters, digits, hyphen and underscore", () => {
  ["id", "a", "A1", "chart-abc12345", "beat_3-mermaid-0", "_", "-", "0"].forEach((id) => {
    assert.strictEqual(isSafeElementId(id), true, `${JSON.stringify(id)} must be permitted`);
  });
});

// The near-miss half. Every one of these is safe in SOME context and not in others, which is
// the reason the rule is a permitted set rather than a list of characters to escape.
test("everything else is rejected, including characters that only break one context", () => {
  [
    "", // an empty id silently matches nothing
    '" onload="pwn()" x=', // breaks the HTML attribute
    "a'b", // breaks a JavaScript string literal, not the attribute
    "a b",
    "a.b", // a CSS class selector, not an id, if used in one
    "a:b",
    "a/b",
    "a\\b",
    "第1章",
    "a\nb",
    "<b>",
    "a&b",
  ].forEach((id) => {
    assert.strictEqual(isSafeElementId(id), false, `${JSON.stringify(id)} must be rejected`);
    assert.throws(() => assertSafeElementId(id), /element id must match/, `${JSON.stringify(id)} must throw`);
  });
});

test("the error says what to do instead", () => {
  assert.throws(() => assertSafeElementId("a b"), /Derive it from the beat's index, or sanitize the beat's id/);
});
