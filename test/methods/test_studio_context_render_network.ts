import test from "node:test";
import assert from "node:assert";
import { MulmoStudioContextMethods } from "../../src/methods/mulmo_studio_context.js";
import { createMockContext } from "../actions/utils.js";
import { getFileObject } from "../../src/cli/helpers.js";

test("getRenderNetworkOptions: off unless the context opts in; the roots are the script folder and the output folders", () => {
  const context = createMockContext();
  const { mulmoFileDirPath, outDirPath, imageDirPath, audioDirPath } = context.fileDirs;
  assert.deepStrictEqual(MulmoStudioContextMethods.getRenderNetworkOptions(context), {
    strictNetwork: false,
    allowedFileRoots: [mulmoFileDirPath, outDirPath, imageDirPath, audioDirPath],
  });
  assert.strictEqual(MulmoStudioContextMethods.getRenderNetworkOptions({ ...context, strictNetwork: true }).strictNetwork, true);
});

test("getRenderNetworkOptions: a script loaded by URL gets no local script folder, only the output folders", () => {
  const files = getFileObject({ file: "https://example.test/untrusted.json", basedir: "/work/project" });
  const context = { ...createMockContext(), fileDirs: files, strictNetwork: true };
  const { allowedFileRoots } = MulmoStudioContextMethods.getRenderNetworkOptions(context);
  assert.deepStrictEqual(allowedFileRoots, [files.outDirPath, files.imageDirPath, files.audioDirPath]);
  assert.ok(!allowedFileRoots.includes(files.mulmoFileDirPath), files.mulmoFileDirPath);
});
