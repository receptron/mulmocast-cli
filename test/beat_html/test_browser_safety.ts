import test from "node:test";
import assert from "node:assert";
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import * as esbuild from "esbuild";
import ts from "typescript";

/**
 * `beat_html` exists to be bundled into a browser, and this repo's browser failures are
 * RUNTIME errors rather than compile errors — df4c22fd is the precedent, where one
 * transitive import reached puppeteer and its module-load `node:util.debuglog` call threw
 * inside a Vite bundle. So the question has to be answered mechanically.
 *
 * It is answered by BUNDLING, not by scanning. An earlier version of this file read import
 * statements with regexes and enumerated the forbidden shapes; review found three more
 * shapes it missed (dynamic `import()`, `require()`, `node:`-less builtins like `require("fs")`,
 * and builtins reached transitively through a dependency's own dependencies). A language
 * always has one more way to say a thing than anyone will list. esbuild resolves every form
 * there is, follows the whole graph, and fails on a builtin it cannot provide — so the rule
 * became "this must bundle for a browser" instead of a list of ways it must not.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = "src/utils/beat_html/index.ts";
const SRC_DIR = join(REPO, "src", "utils", "beat_html");

/** Comments carry example code; scanning them would produce false positives. */
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * Packages `beat_html` may reach. esbuild decides whether a package WORKS in a browser;
 * this decides whether it BELONGS here. Adding one is a deliberate act, not a side effect
 * of an import — the smaller this graph stays, the less there is to go wrong in a bundle.
 */
const ALLOWED_PACKAGES = new Set(["marked"]);

const bundle = (options: esbuild.BuildOptions) =>
  esbuild.build({
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
    logLevel: "silent",
    absWorkingDir: REPO,
    ...options,
  });

test("beat_html bundles for a browser", async () => {
  // Nothing is stubbed or externalised: a Node builtin anywhere in the graph, reached by
  // any import form, is an unresolvable import here and fails the build.
  const result = await bundle({ entryPoints: [ENTRY] });
  assert.deepStrictEqual(result.errors, []);
});

test("the bundle check fails on a Node builtin, in every form it can arrive in", async () => {
  // Without this the test above is green whether it works or not. Each of these is a shape
  // the previous regex scanner missed, which is why they are listed individually.
  const shapes: [string, string][] = [
    ["node: prefix", 'import fs from "node:fs"; export const x = fs;'],
    ["bare builtin", 'import fs from "fs"; export const x = fs;'],
    ["dynamic import", 'export const x = async () => (await import("node:fs")).readFileSync;'],
    ["require", 'export const x = () => require("fs");'],
    ["transitive, through a dependency", 'import y from "yargs"; export const x = y;'],
  ];
  await Promise.all(
    shapes.map(async ([label, contents]) => {
      await assert.rejects(() => bundle({ stdin: { contents, resolveDir: REPO, loader: "ts" } }), `a browser bundle should not survive ${label}`);
    }),
  );
});

test("beat_html reaches only allow-listed packages", async () => {
  const result = await bundle({ entryPoints: [ENTRY] });
  const reached = new Set(
    Object.keys(result.metafile?.inputs ?? {}).flatMap((file) => {
      const match = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(file);
      return match ? [match[1]] : [];
    }),
  );
  const unexpected = [...reached].filter((pkg) => !ALLOWED_PACKAGES.has(pkg)).sort();
  const listed = unexpected.join(", ");
  assert.deepStrictEqual(unexpected, [], `beat_html reached packages not on the allow-list: ${listed}.`);

  // A metafile listing nothing would clear the allow-list without checking anything.
  assert.ok(reached.size > 0, "the bundle reached no package at all — the metafile proved nothing");
});

// ═══════════════════════════════════════════════════════════
// What a bundler structurally cannot see.
//
// esbuild answers "what does this module's import graph pull in". It cannot answer
// "does this code touch Node at runtime without importing anything" — `process.cwd()`
// bundles perfectly and fails only in a browser. Measured: `process`, `Buffer`, a
// computed `import(`node:${m}`)` and `require(m)` all bundle clean.
//
// So the second layer asks the compiler instead, with Node's types taken away. That is
// the same inversion as above rather than another list of banned words: the compiler
// enumerates what EXISTS in a browser, and anything Node-only stops compiling — in any
// form, computed or not.
// ═══════════════════════════════════════════════════════════

test("beat_html compiles with no Node types available", () => {
  const files = readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(SRC_DIR, f));
  assert.ok(files.length > 0, "found no beat_html sources to check");

  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    // The whole point: no @types/node, and no DOM either — this module returns strings.
    types: [],
    lib: ["lib.es2022.d.ts"],
  });

  // Only this module's own files. The type-only imports it makes reach code that is
  // allowed to be Node-flavoured; what matters is that beat_html itself is not.
  const ours = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName.includes("/beat_html/"))
    .map((d) => `${d.file?.fileName.slice(REPO.length + 1)}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  assert.deepStrictEqual(ours, [], `beat_html does not compile without Node types:\n${ours.join("\n")}`);
});

test("the no-Node-types check actually rejects Node globals", () => {
  // Same trap as everywhere else: a program that resolved nothing reports no diagnostics.
  const shapes = ["process.cwd()", "Buffer.from('a')", "__dirname", "require('fs')"];
  const rejected = shapes.filter((expr) => {
    const file = join(SRC_DIR, "__probe__.ts");
    writeFileSync(file, `export const probe = () => ${expr};\n`);
    try {
      const program = ts.createProgram([file], {
        target: ts.ScriptTarget.ES2022,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        lib: ["lib.es2022.d.ts"],
      });
      return ts.getPreEmitDiagnostics(program).length > 0;
    } finally {
      unlinkSync(file);
    }
  });
  assert.deepStrictEqual(rejected, shapes, "the no-Node-types check let a Node global through");
});

test("beat_html uses only static imports", () => {
  // The one shape neither layer above can see is a computed specifier —
  // `import(`node:${m}`)` bundles clean and typechecks clean. This module has no reason
  // to load anything dynamically, so it does not: one rule covering every specifier
  // shape, literal or computed, rather than a list of the ones thought of so far.
  const offenders = readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => /\bimport\s*\(/.test(stripComments(readFileSync(join(SRC_DIR, f), "utf8"))));
  assert.deepStrictEqual(offenders, [], `dynamic import in beat_html: ${offenders.join(", ")}`);
});
