import test from "node:test";
import assert from "node:assert";
import { backupPathOf, commitFiles, FileMove, FileOps } from "../../src/utils/remotion/commit_files.js";

// An in-memory file system whose Nth rename throws, so every point of failure can be exercised.
const memoryFs = (initial: Record<string, string>, failOnRename?: number) => {
  const files = new Map(Object.entries(initial));
  const renames = { count: 0 };
  const ops: FileOps = {
    exists: (file) => files.has(file),
    rename: (from, to) => {
      renames.count += 1;
      if (renames.count === failOnRename) throw new Error(`rename #${renames.count} failed`);
      const content = files.get(from);
      if (content === undefined) throw new Error(`no such file: ${from}`);
      files.delete(from);
      files.set(to, content);
    },
    remove: (file) => {
      files.delete(file);
    },
  };
  return { files, ops, renames };
};

const before = { "/v.mp4": "old video", "/s.png": "old still", "/c.tsx": "old code", "/v.r.mp4": "new video", "/s.r.png": "new still", "/c.r.tsx": "new code" };
const moves: FileMove[] = [
  { from: "/v.r.mp4", to: "/v.mp4" },
  { from: "/s.r.png", to: "/s.png" },
  { from: "/c.r.tsx", to: "/c.tsx" },
];

test("commitFiles: every move lands and no backup is left", () => {
  const { files, ops } = memoryFs(before);
  commitFiles(moves, ops);
  assert.deepStrictEqual(Object.fromEntries(files), { "/v.mp4": "new video", "/s.png": "new still", "/c.tsx": "new code" });
});

test("commitFiles: a move onto a path that does not exist yet needs no backup", () => {
  const { files, ops } = memoryFs({ "/v.r.mp4": "new video" });
  commitFiles([{ from: "/v.r.mp4", to: "/v.mp4" }], ops);
  assert.deepStrictEqual(Object.fromEntries(files), { "/v.mp4": "new video" });
});

test("commitFiles: a failure at ANY rename restores every original and rethrows", () => {
  // three moves onto existing files: a backup rename and a move rename each, so six renames
  const renameCount = moves.length * 2;
  Array.from({ length: renameCount }, (_, index) => index + 1).forEach((failAt) => {
    const { files, ops } = memoryFs(before, failAt);
    assert.throws(() => commitFiles(moves, ops), new RegExp(`rename #${failAt} failed`));
    assert.deepStrictEqual(Object.fromEntries(files), before, `state after a failure at rename #${failAt}`);
    moves.forEach(({ to }) => assert.ok(!files.has(backupPathOf(to)), `backup of ${to} left after failure at #${failAt}`));
  });
});

test("commitFiles: no moves is a no-op", () => {
  const { files, ops, renames } = memoryFs(before);
  commitFiles([], ops);
  assert.deepStrictEqual(Object.fromEntries(files), before);
  assert.strictEqual(renames.count, 0);
});
