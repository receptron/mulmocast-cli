import { after } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// One factory per test file: every directory it hands out is removed when that file's tests finish.
export const trackedTmpDirs = (prefix: string) => {
  const created: string[] = [];
  after(() => created.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));
  return () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    created.push(dir);
    return dir;
  };
};
