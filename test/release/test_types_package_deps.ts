import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { declaredDependencies, sharedDependencyMismatches } from "./shared_dependencies.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readManifest = (relative: string): unknown => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../..", relative), "utf8"));

// 2.21.0 raised @mulmocast/deck in the root only; @mulmocast/types stayed on the old deck, lacked the
// `figure` layout, and a mulmocast MulmoStudioContext no longer assigned to its type (TS2322).
test("types/package.json gives every dependency it shares with the root the same range", () => {
  const mismatches = sharedDependencyMismatches(readManifest("package.json"), readManifest("types/package.json"));
  assert.deepStrictEqual(
    mismatches,
    [],
    "raise these in types/package.json too (cd types && yarn add …), and publish @mulmocast/types — its .d.ts inlines their types",
  );
});

test("the check really sees the shared dependencies", () => {
  const shared = Object.keys(declaredDependencies(readManifest("types/package.json"), ["dependencies"])).filter(
    (name) => name in declaredDependencies(readManifest("package.json")),
  );
  assert.ok(shared.includes("@mulmocast/deck"), `deck is no longer shared: ${shared.join(", ")}`);
});

test("sharedDependencyMismatches: a range raised on one side only is reported, with both ranges", () => {
  const root = { dependencies: { "@mulmocast/deck": "^2.1.0", zod: "^4.6.5", graphai: "^2.0.0" } };
  const types = { dependencies: { "@mulmocast/deck": "^2.0.0", zod: "^4.6.5" }, peerDependencies: { graphai: "^2.0.0" } };
  assert.deepStrictEqual(sharedDependencyMismatches(root, types), [{ name: "@mulmocast/deck", root: "^2.1.0", types: "^2.0.0" }]);
});

test("sharedDependencyMismatches: dependencies only one side declares are not compared", () => {
  assert.deepStrictEqual(sharedDependencyMismatches({ dependencies: { a: "^1.0.0" } }, { devDependencies: { b: "^2.0.0" } }), []);
});

test("sharedDependencyMismatches: the root's dependency may sit in any field", () => {
  assert.deepStrictEqual(sharedDependencyMismatches({ devDependencies: { zod: "^4.6.5" } }, { dependencies: { zod: "^4.4.3" } }), [
    { name: "zod", root: "^4.6.5", types: "^4.4.3" },
  ]);
});

test("sharedDependencyMismatches: the types package's peer and dev dependencies are not compared", () => {
  const root = { dependencies: { graphai: "^2.0.18" }, devDependencies: { "@types/node": "^26.6.5" } };
  const types = { peerDependencies: { graphai: "^2.0.0" }, devDependencies: { "@types/node": "^26.0.0" } };
  assert.deepStrictEqual(sharedDependencyMismatches(root, types), []);
});

test("declaredDependencies: anything that is not a map of strings counts as no dependencies", () => {
  [null, undefined, "x", 3, [], { dependencies: null }, { dependencies: ["a"] }, { dependencies: { a: 1 } }].forEach((manifest) => {
    assert.deepStrictEqual(declaredDependencies(manifest), {}, JSON.stringify(manifest));
  });
});
