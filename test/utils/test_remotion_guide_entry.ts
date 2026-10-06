import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import * as guideEntry from "../../src/index.remotion_guide.js";
import * as remotionEntry from "../../src/index.remotion.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = "src/index.remotion_guide.ts";
const SUBPATH = "./remotion/guide";

// A tool description that quotes the guide reaches a browser bundle, so this entry must bundle for a
// browser on its own. Nothing is externalised: a Node builtin anywhere in the graph fails the build.
const bundleForBrowser = (entry: string) =>
  esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
    logLevel: "silent",
    absWorkingDir: REPO,
  });

const packagesReached = (metafile: esbuild.Metafile | undefined) => Object.keys(metafile?.inputs ?? {}).filter((file) => file.includes("node_modules/"));

test("mulmocast/remotion/guide bundles for a browser and reaches no package", async () => {
  const result = await bundleForBrowser(ENTRY);
  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(packagesReached(result.metafile), []);
});

test("mulmocast/remotion does not bundle for a browser — the reason the guide has its own entry", async () => {
  // If this starts passing, the guide entry is no longer needed; until then it pins why it exists.
  await assert.rejects(() => bundleForBrowser("src/index.remotion.ts"));
});

test("both entries export the same guide", () => {
  assert.strictEqual(guideEntry.REMOTION_COMPONENT_GUIDE, remotionEntry.REMOTION_COMPONENT_GUIDE);
  assert.ok(guideEntry.REMOTION_COMPONENT_GUIDE.length > 0);
});

test("the package export points at the file tsc emits for this entry", () => {
  const exportsMap: Record<string, { default: string; types: string }> = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).exports;
  const emitted = ENTRY.replace(/^src\//, "./lib/").replace(/\.ts$/, "");
  assert.deepStrictEqual(exportsMap[SUBPATH], { types: `${emitted}.d.ts`, default: `${emitted}.js` });
});
