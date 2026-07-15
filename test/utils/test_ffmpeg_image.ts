import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "@modernized/fluent-ffmpeg";
import { ffmpegGetImageDimensions, padImageToCanvas } from "../../src/utils/ffmpeg_utils.js";

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

test("ffmpegGetImageDimensions returns the image size", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmo-ffmpeg-image-"));
  const src = path.join(dir, "src.png");
  await createSolidPng(src, 300, 200);

  const { width, height } = await ffmpegGetImageDimensions(src);
  assert.strictEqual(width, 300);
  assert.strictEqual(height, 200);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("padImageToCanvas pads to the requested canvas size", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmo-ffmpeg-image-"));
  const src = path.join(dir, "src.png");
  const dest = path.join(dir, "dest.png");
  await createSolidPng(src, 1536, 1024); // gpt-image landscape size

  await padImageToCanvas(src, dest, 1280, 720, "#F7F6F4");

  assert.ok(fs.existsSync(dest));
  const { width, height } = await ffmpegGetImageDimensions(dest);
  assert.strictEqual(width, 1280);
  assert.strictEqual(height, 720);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ffmpegGetImageDimensions rejects for a missing file", async () => {
  await assert.rejects(ffmpegGetImageDimensions("/nonexistent/no_such_image.png"));
});
