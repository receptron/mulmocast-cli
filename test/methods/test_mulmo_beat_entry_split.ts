import test from "node:test";
import assert from "node:assert/strict";

// Regression test for the browser-safe / Node-augmented split of MulmoBeatMethods
// introduced to keep utils/image_plugins (and its puppeteer/mulmocast-vision chain)
// out of the mulmocast/browser bundle.
//
// If this test fails, mulmocast/browser will start pulling puppeteer into browser
// bundles again and Vite consumers will hit
// `TypeError: import_browser_external_node_util$1.debuglog is not a function`.

test("methods/mulmo_beat.ts stays browser-safe: no getPlugin", async () => {
  const { MulmoBeatMethods } = await import("../../src/methods/mulmo_beat.js");
  assert.equal(typeof MulmoBeatMethods.isAnimationEnabled, "function");
  assert.equal(typeof MulmoBeatMethods.getHtmlPrompt, "function");
  assert.equal(
    (MulmoBeatMethods as unknown as Record<string, unknown>).getPlugin,
    undefined,
    "getPlugin must not exist on the browser-safe MulmoBeatMethods — it would drag image_plugins into mulmocast/browser",
  );
});

test("methods/index.ts (Node entry) exposes getPlugin on MulmoBeatMethods", async () => {
  const { MulmoBeatMethods } = await import("../../src/methods/index.js");
  assert.equal(typeof MulmoBeatMethods.getPlugin, "function");
  // The Node version must still carry the browser-safe methods (spread contract).
  assert.equal(typeof MulmoBeatMethods.isAnimationEnabled, "function");
  assert.equal(typeof MulmoBeatMethods.getHtmlPrompt, "function");
});

test("mulmo_beat.ts source does not import image_plugins", async () => {
  const fs = await import("node:fs/promises");
  const url = await import("node:url");
  const source = await fs.readFile(url.fileURLToPath(new URL("../../src/methods/mulmo_beat.ts", import.meta.url)), "utf8");
  assert.equal(
    /from ["'][^"']*image_plugins/.test(source),
    false,
    "src/methods/mulmo_beat.ts must not import from image_plugins — that pulls puppeteer into mulmocast/browser",
  );
});
