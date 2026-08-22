import test from "node:test";
import assert from "node:assert";
import { writeFileSync, unlinkSync } from "node:fs";
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
 *
 * Three layers, because no one of them can answer the whole question:
 *
 *   1. the bundle          — the import graph, every static form, transitively
 *   2. the no-Node-types compile — Node globals and `require`, which touch no module
 *                            resolution and so are invisible to any bundler
 *   3. static imports only — a computed specifier, which is invisible to both
 *
 * WHAT NONE OF THEM CATCH: Node reached through `eval("require")`,
 * `Function("return process")()`, or anything else that hides an identifier from the
 * compiler at runtime. Nothing here would notice, and saying so is more useful than a
 * fourth layer that pretends otherwise — the module is small and its imports are read
 * by humans in review.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = "src/utils/beat_html/index.ts";
const SRC_DIR = join(REPO, "src", "utils", "beat_html");

/**
 * The local files the browser bundle actually includes — esbuild's own input list, not a
 * directory listing. A helper living outside `beat_html` and value-imported into it is part
 * of the bundle and has to obey the same rules; scanning the folder would miss it, which
 * review caught by writing exactly that helper and watching every test stay green.
 */
const bundledLocalSources = async (): Promise<string[]> => {
  const result = await bundle({ entryPoints: [ENTRY] });
  const files = Object.keys(result.metafile?.inputs ?? {})
    .filter((f) => !f.includes("node_modules/"))
    .map((f) => join(REPO, f));
  assert.ok(files.length > 0, "the bundle reported no local input — the metafile proved nothing");
  return files;
};

/** Compiler options with Node taken away — see the layer-2 test for why. */
const BROWSER_ONLY: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  types: [],
  lib: ["lib.es2022.d.ts"],
};

/**
 * Packages `beat_html` may reach. esbuild decides whether a package WORKS in a browser;
 * this decides whether it BELONGS here. Adding one is a deliberate act, not a side effect
 * of an import — the smaller this graph stays, the less there is to go wrong in a bundle.
 */
// @mulmocast/deck is here for escapeHtml and for generateSlideFragment, imported deeply
// rather than through the package barrel: the barrel pulls every layout AND all of zod
// (101 inputs / 602kb measured), the deep paths pull 19 files. The slide layouts are the
// bulk of that and are inherent — they are the slide renderer — so the whole beat_html
// bundle measures 35 inputs / 119kb, of which marked is 1 and this repo's own source 15.
const ALLOWED_PACKAGES = new Set(["marked", "@mulmocast/deck"]);

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

test("everything the bundle includes compiles with no Node types available", async () => {
  const files = await bundledLocalSources();
  const program = ts.createProgram(files, BROWSER_ONLY);

  // Filtered by the bundle's input set, not by directory. Type-only imports are erased
  // and never reach the bundle, so the code they name stays free to be Node-flavoured;
  // anything the bundle actually carries is not.
  const bundled = new Set(files);
  const ours = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && bundled.has(d.file.fileName))
    .map((d) => `${d.file?.fileName.slice(REPO.length + 1)}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  assert.deepStrictEqual(ours, [], `bundled sources do not compile without Node types:\n${ours.join("\n")}`);
});

test("the no-Node-types check actually rejects Node globals", () => {
  // Same trap as everywhere else: a program that resolved nothing reports no diagnostics.
  const shapes = ["process.cwd()", "Buffer.from('a')", "__dirname", "require('fs')"];
  // Written into beat_html itself; the check under test reads the bundle's input list.
  const rejected = shapes.filter((expr) => {
    const file = join(SRC_DIR, "__probe__.ts");
    writeFileSync(file, `export const probe = () => ${expr};\n`);
    try {
      const program = ts.createProgram([file], BROWSER_ONLY);
      return ts.getPreEmitDiagnostics(program).length > 0;
    } finally {
      unlinkSync(file);
    }
  });
  assert.deepStrictEqual(rejected, shapes, "the no-Node-types check let a Node global through");
});

test("everything the bundle includes uses only static imports", async () => {
  // The one shape neither layer above can see is a computed specifier —
  // `import(`node:${m}`)` bundles clean and typechecks clean. This module has no reason
  // to load anything dynamically, so it does not: one rule covering every specifier
  // shape, literal or computed.
  //
  // Asked of the parser, not of a regex. The regex version stripped comments first, so a
  // string containing `//` — `"https://marked.js.org"` — swallowed the rest of its line
  // and hid an `import(` sitting after it. Review found that by writing exactly that
  // line. A parser distinguishes a comment from a string by construction, which is the
  // whole reason to use one.
  const files = await bundledLocalSources();
  const program = ts.createProgram(files, BROWSER_ONLY);
  const bundled = new Set(files);

  const offenders: string[] = [];
  const visit = (node: ts.Node, file: ts.SourceFile): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      offenders.push(`${file.fileName.slice(REPO.length + 1)}:${line + 1}`);
    }
    ts.forEachChild(node, (child) => visit(child, file));
  };
  program
    .getSourceFiles()
    .filter((file) => bundled.has(file.fileName))
    .forEach((file) => visit(file, file));

  assert.deepStrictEqual(offenders, [], `dynamic import in a bundled source: ${offenders.join(", ")}`);
});

test("the dynamic-import check sees through comments and strings", () => {
  // Both halves matter. The first is the shape that defeated the regex; the second is a
  // near-miss that must NOT be reported, because a check that flags everything is as
  // useless as one that flags nothing.
  const probe = (contents: string): number => {
    const file = ts.createSourceFile("probe.ts", contents, ts.ScriptTarget.ES2022, true);
    let count = 0;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) count++;
      ts.forEachChild(node, visit);
    };
    visit(file);
    return count;
  };
  assert.strictEqual(probe('const u = "https://x.org"; export const f = () => import("node:fs");'), 1, "hidden behind a string containing //");
  assert.strictEqual(probe('// export const f = () => import("node:fs");\nexport const g = 1;'), 0, "a commented-out call is not a call");
  assert.strictEqual(probe("export const s = \"import('node:fs')\";"), 0, "a call inside a string literal is not a call");
});
