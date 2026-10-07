import test from "node:test";
import assert from "node:assert";
import { process as processVision } from "../../src/utils/image_plugins/vision.js";
import { createMockContext } from "../actions/utils.js";
import type { MulmoBeat } from "../../src/types/index.js";

const visionBeat: MulmoBeat = { text: "", image: { type: "vision", style: "imageSlide", data: { imageUrl: "http://127.0.0.1:9/x.png" } } };

test("vision plugin: refuses to render with strict network mode, before launching any browser", async () => {
  const context = { ...createMockContext(), strictNetwork: true };
  await assert.rejects(
    () => processVision({ beat: visionBeat, context, imagePath: "/nonexistent/out.png", textSlideStyle: "", canvasSize: { width: 1280, height: 720 } }),
    (error: Error) => /--strict-network/.test(error.message) && JSON.stringify(error.cause).includes("unsupportedImageType"),
  );
});
