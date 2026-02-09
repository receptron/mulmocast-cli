import path from "node:path";
import { getBaseDirPath, getFullPath } from "../../src/utils/file.js";

import test from "node:test";
import assert from "node:assert";

test("test getBaseDirPath pwd", async () => {
  const result = getBaseDirPath();
  assert.deepStrictEqual(result, process.cwd());
});

test("test getBaseDirPath absolute", async () => {
  const result = getBaseDirPath("/foo//aa");
  assert.deepStrictEqual(result, path.normalize("/foo//aa"));
});

test("test getBaseDirPath related", async () => {
  const result = getBaseDirPath("foo//aa");
  assert.deepStrictEqual(result, path.resolve(process.cwd(), "foo//aa"));
});

// arg1 = related(foo), full(/foo//aa), undefined,  / arg2 = related(bar) full(//bar/bb)

test("test getFullPath 1", async () => {
  // join path based on cwd
  const result = getFullPath("foo", "bar");
  assert.deepStrictEqual(result, path.resolve("foo", "bar"));
});

test("test getFullPath 2", async () => {
  // arg2
  const result = getFullPath("foo", "//bar/bb");
  assert.deepStrictEqual(result, path.normalize("//bar/bb"));
});

test("test getFullPath 3", async () => {
  // join path
  const result = getFullPath("/foo//aa", "bar");
  assert.deepStrictEqual(result, path.resolve("/foo//aa", "bar"));
});

test("test getFullPath 4", async () => {
  // arg2
  const result = getFullPath("/foo//aa", "//bar/bb");
  assert.deepStrictEqual(result, path.normalize("//bar/bb"));
});

test("test getFullPath 5", async () => {
  // arg2 based on cwd
  const result = getFullPath(undefined as unknown as string, "bar");
  assert.deepStrictEqual(result, path.resolve("bar"));
});

test("test getFullPath 6", async () => {
  // arg2
  const result = getFullPath(undefined as unknown as string, "//bar/bb");
  assert.deepStrictEqual(result, path.normalize("//bar/bb"));
});
