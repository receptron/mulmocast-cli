import test from "node:test";
import assert from "node:assert";

import { MulmoScriptMethods } from "../../src/methods/mulmo_script.js";
import type { MulmoScript } from "../../src/types/index.js";

const scriptWith = (credit?: "closing"): MulmoScript =>
  ({
    $mulmocast: { version: "1.1", ...(credit ? { credit } : {}) },
    title: "Test",
    lang: "en",
    beats: [],
    canvasSize: { width: 1920, height: 1080 },
  }) as unknown as MulmoScript;

test("hasClosingCredit is true when credit is 'closing'", () => {
  assert.strictEqual(MulmoScriptMethods.hasClosingCredit(scriptWith("closing")), true);
});

test("hasClosingCredit is false when credit is unset", () => {
  assert.strictEqual(MulmoScriptMethods.hasClosingCredit(scriptWith()), false);
});
