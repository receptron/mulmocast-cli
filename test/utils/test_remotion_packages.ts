import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REMOTION_PACKAGES,
  REMOTION_RENDER_PACKAGES,
  REMOTION_SCENE_PACKAGES,
  missingRemotionPackages,
  remotionInstallCommand,
} from "../../src/utils/remotion/packages.js";
import { REMOTION_SYSTEM_PROMPT } from "../../src/utils/remotion/system_prompt.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("missingRemotionPackages: lists exactly the packages that are not installed, in order", () => {
  const installed = new Set(["remotion", "react"]);
  const missing = missingRemotionPackages((name) => installed.has(name));
  assert.deepStrictEqual(
    missing,
    REMOTION_PACKAGES.filter((name) => !installed.has(name)),
  );
  assert.deepStrictEqual(
    missingRemotionPackages(() => true),
    [],
  );
  assert.deepStrictEqual(
    missingRemotionPackages(() => false),
    [...REMOTION_PACKAGES],
  );
});

test("remotionInstallCommand: names every package", () => {
  const command = remotionInstallCommand();
  REMOTION_PACKAGES.forEach((name) => assert.ok(command.split(" ").includes(name), name));
});

test("system prompt allows every scene package and none of the render-only ones", () => {
  REMOTION_SCENE_PACKAGES.forEach((name) => assert.ok(REMOTION_SYSTEM_PROMPT.includes(`"${name}"`), name));
  ["@remotion/bundler", "@remotion/renderer", "react-dom"].forEach((name) => assert.ok(!REMOTION_SYSTEM_PROMPT.includes(`"${name}"`), name));
  assert.ok(REMOTION_RENDER_PACKAGES.includes("remotion"));
});

test("docs/remotion.md install command lists every package the code requires", () => {
  const docs = fs.readFileSync(path.join(REPO, "docs", "remotion.md"), "utf8");
  const block = /```bash\n(npm install[\s\S]*?)```/.exec(docs);
  assert.ok(block, "docs/remotion.md has an npm install block");
  const words = block[1].split(/[\s\\]+/);
  REMOTION_PACKAGES.forEach((name) => assert.ok(words.includes(name), `docs install command misses ${name}`));
});

test("every package is an optional peer dependency in package.json", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
  REMOTION_PACKAGES.forEach((name) => {
    assert.ok(pkg.peerDependencies?.[name], `peerDependencies misses ${name}`);
    assert.strictEqual(pkg.peerDependenciesMeta?.[name]?.optional, true, `${name} is not optional`);
  });
});
