import path from "node:path";
import { getBaseDirPath, getFullPath, formatAudioFileName, getAudioFilePath, getGroupedAudioFilePath } from "../../src/utils/file.js";

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

// formatAudioFileName
test("test formatAudioFileName without lang", async () => {
  const result = formatAudioFileName("hello");
  assert.strictEqual(result, "hello.mp3");
});

test("test formatAudioFileName with lang", async () => {
  const result = formatAudioFileName("hello", "ja");
  assert.strictEqual(result, "hello_ja.mp3");
});

test("test formatAudioFileName with empty string name", async () => {
  const result = formatAudioFileName("");
  assert.strictEqual(result, ".mp3");
});

// getAudioFilePath uses formatAudioFileName
test("test getAudioFilePath without lang", async () => {
  const result = getAudioFilePath("/out/audio", "project", "segment");
  assert.strictEqual(result, path.resolve("/out/audio", "project", "segment.mp3"));
});

test("test getAudioFilePath with lang", async () => {
  const result = getAudioFilePath("/out/audio", "project", "segment", "en");
  assert.strictEqual(result, path.resolve("/out/audio", "project", "segment_en.mp3"));
});

// getGroupedAudioFilePath
test("test getGroupedAudioFilePath without lang", async () => {
  const result = getGroupedAudioFilePath("/out/project/audio", "segment");
  assert.strictEqual(result, path.resolve("/out/project/audio", "segment.mp3"));
});

test("test getGroupedAudioFilePath with lang", async () => {
  const result = getGroupedAudioFilePath("/out/project/audio", "segment", "ja");
  assert.strictEqual(result, path.resolve("/out/project/audio", "segment_ja.mp3"));
});

// getAudioFilePath and getGroupedAudioFilePath produce equivalent paths when grouped collapses dir
test("test grouped vs non-grouped audio path equivalence", async () => {
  const audioDirPath = "/out/audio";
  const dirName = "project";
  const fileName = "segment";
  const lang = "en";
  const nonGrouped = getAudioFilePath(audioDirPath, dirName, fileName, lang);
  const grouped = getGroupedAudioFilePath(path.resolve(audioDirPath, dirName), fileName, lang);
  assert.strictEqual(nonGrouped, grouped);
});
