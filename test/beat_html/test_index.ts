import test from "node:test";
import assert from "node:assert";
import { beatToHtml } from "../../src/utils/beat_html/index.js";

// The contract tells callers to pass something derived from the beat's index — `beat-3`,
// not `3`, since an id must not start with a digit — or a sanitized id. A beat's own `id`
// comes from the script and is unrestricted, so the boundary refuses rather than guessing a
// repair — a guess can collapse two beats onto one element id, which is the bug idPrefix exists to prevent.
test("beatToHtml refuses an idPrefix outside the permitted set", () => {
  const beat = { image: { type: "markdown", markdown: "# T" } };
  ['" onload="pwn()" x=', "beat 1", "第1章", "", "0", "3"].forEach((idPrefix) => {
    assert.throws(() => beatToHtml(beat, { idPrefix }), /element id must match/, `${JSON.stringify(idPrefix)} must be rejected`);
  });
});

test("beatToHtml accepts the shapes the contract recommends", () => {
  const beat = { image: { type: "markdown", markdown: "# T" } };
  ["beat-0", "beat-3", "beat_3", "b3"].forEach((idPrefix) => {
    assert.ok(beatToHtml(beat, { idPrefix }), `${idPrefix} must be accepted`);
  });
});
