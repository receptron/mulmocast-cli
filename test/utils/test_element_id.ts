import test from "node:test";
import assert from "node:assert";
import { assertSafeElementId, isSafeElementId } from "../../src/utils/element_id.js";

test("the permitted set starts with a letter or underscore", () => {
  ["id", "a", "A1", "chart-abc12345", "beat_3-mermaid-0", "_", "_0", "a-", "beat-0"].forEach((id) => {
    assert.strictEqual(isSafeElementId(id), true, `${JSON.stringify(id)} must be permitted`);
  });
});

// Measured in a browser, not read off a spec: querySelector("#0"), "#-", "#0a" and "#-0" all
// throw, while getElementById accepts every one of them. An id can therefore work today and
// become unusable the moment anything reaches for it with a selector, so the leading
// character is restricted. `-a` is valid CSS and rejected anyway — the set is deliberately a
// little narrower than CSS in exchange for being stateable in one line.
test("a leading digit or hyphen is rejected, because a CSS id selector cannot take it", () => {
  ["0", "-", "0a", "-0", "-a", "--a", "9beat"].forEach((id) => {
    assert.strictEqual(isSafeElementId(id), false, `${JSON.stringify(id)} must be rejected`);
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
  assert.throws(() => assertSafeElementId("a b"), /Derive it from the beat's index/);
});
