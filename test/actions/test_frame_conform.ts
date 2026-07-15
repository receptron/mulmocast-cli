// Tests for conforming firstFrame/lastFrame reference images to the canvas aspect ratio.
import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "@modernized/fluent-ffmpeg";
import { imagePreprocessAgent, conformFrameImageToCanvas } from "../../src/actions/image_agents.js";
import { ffmpegGetImageDimensions } from "../../src/utils/ffmpeg_utils.js";

import { createMockContext, createMockBeat } from "./utils2.js";

const createSolidPng = (filePath: string, width: number, height: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=0xF7F6F4:s=${width}x${height}`)
      .inputFormat("lavfi")
      .outputOptions(["-frames:v", "1"])
      .output(filePath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
};

// Context whose image project dir points at a real temp directory (canvas defaults to 1280x720).
const createTempContext = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmo-frame-conform-"));
  const context = createMockContext();
  context.fileDirs = { ...context.fileDirs, imageDirPath: dir };
  fs.mkdirSync(path.join(dir, context.studio.filename), { recursive: true });
  return { context, dir };
};

test("conformFrameImageToCanvas pads a mismatched image to the canvas size", async () => {
  const { context, dir } = createTempContext();
  const src = path.join(dir, "square.png");
  await createSolidPng(src, 400, 400);

  const result = await conformFrameImageToCanvas(context, "square", src, "#F7F6F4");

  assert.strictEqual(result, path.join(dir, context.studio.filename, "square_fit_1280x720.png"));
  const { width, height } = await ffmpegGetImageDimensions(result);
  assert.strictEqual(width, 1280);
  assert.strictEqual(height, 720);

  // second call reuses the conformed file (same path, no error)
  const again = await conformFrameImageToCanvas(context, "square", src, "#F7F6F4");
  assert.strictEqual(again, result);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("conformFrameImageToCanvas returns the original path when the aspect ratio matches", async () => {
  const { context, dir } = createTempContext();
  const src = path.join(dir, "wide.png");
  await createSolidPng(src, 640, 360); // same aspect as 1280x720

  const result = await conformFrameImageToCanvas(context, "wide", src, "#F7F6F4");
  assert.strictEqual(result, src);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("conformFrameImageToCanvas returns the original path when the file does not exist", async () => {
  const context = createMockContext();
  const result = await conformFrameImageToCanvas(context, "ghost", "/test/images/no_such_file.png", "black");
  assert.strictEqual(result, "/test/images/no_such_file.png");
});

test("imagePreprocessAgent conforms firstFrame/lastFrame reference images", async () => {
  const { context, dir } = createTempContext();
  const boardPath = path.join(dir, "board.png");
  const slidePath = path.join(dir, "slide.png");
  await createSolidPng(boardPath, 1280, 720); // already canvas-sized
  await createSolidPng(slidePath, 1536, 1024); // gpt-image landscape size

  const beat = createMockBeat({
    text: "",
    moviePrompt: "A hand draws the illustration stroke by stroke.",
    movieParams: {
      firstFrameImageName: "board",
      lastFrameImageName: "slide",
      frameFillColor: "#F7F6F4",
    },
  });

  const result = await imagePreprocessAgent({
    context,
    beat,
    index: 0,
    imageRefs: { board: boardPath, slide: slidePath },
  });

  assert.ok("firstFrameImagePath" in result && "lastFrameImagePath" in result);
  const { firstFrameImagePath, lastFrameImagePath } = result as { firstFrameImagePath: string; lastFrameImagePath: string };
  assert.strictEqual(firstFrameImagePath, boardPath); // matching aspect: untouched
  assert.strictEqual(lastFrameImagePath, path.join(dir, context.studio.filename, "slide_fit_1280x720.png"));
  const { width, height } = await ffmpegGetImageDimensions(lastFrameImagePath);
  assert.strictEqual(width, 1280);
  assert.strictEqual(height, 720);

  fs.rmSync(dir, { recursive: true, force: true });
});
