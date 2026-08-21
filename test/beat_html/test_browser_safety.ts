import test from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

/**
 * `beat_html` exists to be bundled into a browser. Nothing here can import Node, and the
 * failure mode is not a compile error — df4c22fd is the precedent: one transitive import
 * reached mulmocast-vision -> puppeteer, whose module-load `node:util.debuglog` call threw
 * at runtime in a Vite bundle. That has to be caught mechanically, over the whole import
 * closure rather than the direct imports.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const ENTRY = join(SRC, "utils", "beat_html", "index.ts");

/**
 * Bare packages the closure is allowed to pull in. Enumerating what is permitted rather
 * than what is forbidden fails closed: a new dependency has to be justified here by a
 * human, instead of shipping because nobody thought to ban it.
 */
const ALLOWED_PACKAGES = new Set(["marked"]);

/**
 * Specifiers that survive compilation. `import type` / `export type` are erased, so what
 * they reach never enters a bundle — counting them would force packages onto the
 * allow-list that no browser ever loads, and an allow-list that lists harmless things
 * stops meaning anything.
 */
const FROM_CLAUSE = /\bfrom\s*["']([^"']+)["']/g;
const SIDE_EFFECT_IMPORT = /^[ \t]*import\s*["']([^"']+)["']/gm;
const TYPE_ONLY = /^(?:import|export)\s+type\b/;
/** How far back to look for the `import` / `export` keyword owning a `from` clause. */
const LOOKBACK = 500;

const isTypeOnly = (source: string, fromIndex: number): boolean => {
  const before = source.slice(Math.max(0, fromIndex - LOOKBACK), fromIndex);
  const keyword = Math.max(before.lastIndexOf("import"), before.lastIndexOf("export"));
  return keyword >= 0 && TYPE_ONLY.test(before.slice(keyword));
};

const specifiersIn = (source: string): string[] => {
  // Two linear passes rather than one regex spanning the statement: a lazy `[\s\S]*?`
  // before `from` backtracks super-linearly on a long file.
  const values = [...source.matchAll(FROM_CLAUSE)].filter((m) => !isTypeOnly(source, m.index)).map((m) => m[1]);
  const sideEffects = [...source.matchAll(SIDE_EFFECT_IMPORT)].map((m) => m[1]);
  return [...values, ...sideEffects];
};

/** Resolve a relative specifier written as `.js` (ESM output) back to its `.ts` source. */
const resolveLocal = (fromFile: string, spec: string): string | undefined => {
  const base = resolve(dirname(fromFile), spec);
  return [base.replace(/\.js$/, ".ts"), `${base}.ts`, join(base, "index.ts")].find(existsSync);
};

const walk = (): { files: Set<string>; packages: Set<string>; nodeBuiltins: { file: string; spec: string }[] } => {
  const files = new Set<string>();
  const packages = new Set<string>();
  const nodeBuiltins: { file: string; spec: string }[] = [];
  const queue = [ENTRY];
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || files.has(file)) continue;
    files.add(file);
    specifiersIn(readFileSync(file, "utf8")).forEach((spec) => {
      if (spec.startsWith("node:")) {
        nodeBuiltins.push({ file: file.slice(SRC.length + 1), spec });
        return;
      }
      if (!spec.startsWith(".")) {
        packages.add(spec);
        return;
      }
      const local = resolveLocal(file, spec);
      // An unresolvable relative import would silently shrink the closure, so it is a failure.
      assert.ok(local, `cannot resolve "${spec}" from ${file.slice(SRC.length + 1)}`);
      queue.push(local);
    });
  }
  return { files, packages, nodeBuiltins };
};

test("beat_html imports no Node builtin, anywhere in its closure", () => {
  const { nodeBuiltins } = walk();
  const reached = nodeBuiltins.map((n) => `  ${n.file} -> ${n.spec}`).join("\n");
  assert.deepStrictEqual(nodeBuiltins, [], `Node builtins reachable from beat_html:\n${reached}`);
});

test("beat_html pulls in only packages known to work in a browser", () => {
  const { packages } = walk();
  const unexpected = [...packages].filter((p) => !ALLOWED_PACKAGES.has(p)).sort();
  assert.deepStrictEqual(
    unexpected,
    [],
    `beat_html reached packages not on the allow-list: ${unexpected.join(", ")}. ` + `Confirm each one runs in a browser before adding it to ALLOWED_PACKAGES.`,
  );
});

test("the closure walk actually reaches past the entry file", () => {
  // A walk that resolved nothing would report zero Node builtins and zero packages,
  // which reads exactly like a clean result.
  const { files, packages } = walk();
  assert.ok(files.size >= 2, `expected the closure to span several files, got ${files.size}`);
  assert.ok(packages.size >= 1, "expected at least one third-party package in the closure");
});
