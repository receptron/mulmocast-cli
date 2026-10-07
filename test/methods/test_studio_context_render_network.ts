import test from "node:test";
import assert from "node:assert";
import { MulmoStudioContextMethods } from "../../src/methods/mulmo_studio_context.js";
import { createMockContext } from "../actions/utils.js";

test("getRenderNetworkOptions: off unless the context opts in; the roots are the script folder and the output folders", () => {
  const context = createMockContext();
  const { mulmoFileDirPath, outDirPath, imageDirPath, audioDirPath } = context.fileDirs;
  assert.deepStrictEqual(MulmoStudioContextMethods.getRenderNetworkOptions(context), {
    strictNetwork: false,
    allowedFileRoots: [mulmoFileDirPath, outDirPath, imageDirPath, audioDirPath],
  });
  assert.strictEqual(MulmoStudioContextMethods.getRenderNetworkOptions({ ...context, strictNetwork: true }).strictNetwork, true);
});
