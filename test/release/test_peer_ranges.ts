import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { caretFloor, caretWithin, peerMismatches } from "./peer_ranges.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest: unknown = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"));

// avatarscript was tested at ^0.5.0 while users were told ^0.4.0, so `npm install avatarscript`
// installed 0.4.1 — a version this repository no longer runs.
test("every peer range admits the version this repository is tested with", () => {
  assert.deepStrictEqual(peerMismatches(manifest), [], "raise the peerDependencies range to cover the devDependencies one");
});

const v = (range: string) => {
  const floor = caretFloor(range);
  assert.ok(floor, range);
  return floor;
};

test("caretWithin: the 0.x minor is the compatibility boundary", () => {
  assert.equal(caretWithin(v("^0.5.0"), v("^0.4.0")), false, "0.5 is outside ^0.4.0");
  assert.equal(caretWithin(v("^0.4.1"), v("^0.4.0")), true);
  assert.equal(caretWithin(v("^0.4.0"), v("^0.4.1")), false, "0.4.0 is below the ^0.4.1 floor");
  assert.equal(caretWithin(v("^0.0.3"), v("^0.0.2")), false, "^0.0.z is that patch alone");
});

test("caretWithin: from 1.0.0 the major is the boundary", () => {
  assert.equal(caretWithin(v("^4.0.535"), v("^4.0.533")), true);
  assert.equal(caretWithin(v("^19.3.1"), v("^19.2.0")), true);
  assert.equal(caretWithin(v("^5.0.0"), v("^4.9.9")), false);
  assert.equal(caretWithin(v("^4.0.532"), v("^4.0.533")), false, "below the floor");
  assert.equal(caretWithin(v("^1.0.0"), v("^1.0.0")), true);
});

test("caretFloor: only ^x.y.z is read", () => {
  assert.deepStrictEqual(caretFloor("^0.5.0"), [0, 5, 0]);
  ["~1.2.3", ">=1.0.0", "1.2.3", "^1.2", "*", "latest", "^1.2.3-beta.1"].forEach((range) => assert.equal(caretFloor(range), null, range));
});

test("peerMismatches: reports the outside range and the unreadable one, ignores one-sided entries", () => {
  const result = peerMismatches({
    devDependencies: { a: "^0.5.0", b: "^4.0.535", c: "~1.0.0", onlyDev: "^1.0.0" },
    peerDependencies: { a: "^0.4.0", b: "^4.0.533", c: "^1.0.0", onlyPeer: "^2.0.0" },
  });
  assert.deepStrictEqual(
    result.map((mismatch) => mismatch.name),
    ["a", "c"],
  );
});

test("peerMismatches: a manifest without the fields reports nothing", () => {
  [null, undefined, {}, { devDependencies: null }, { peerDependencies: ["a"] }].forEach((value) => assert.deepStrictEqual(peerMismatches(value), []));
});
