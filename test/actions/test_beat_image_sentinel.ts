// Tests for the "$beatImage" frame sentinel: a beat's own generated image used as a movie frame.
import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "@modernized/fluent-ffmpeg";
import { imagePreprocessAgent, beatFrameResolverAgent } from "../../src/actions/image_agents.js";
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

const createTempContext = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mulmo-beat-image-sentinel-"));
  const context = createMockContext();
  context.fileDirs = { ...context.fileDirs, imageDirPath: dir };
  fs.mkdirSync(path.join(dir, context.studio.filename), { recursive: true });
  return { context, dir };
};

test("imagePreprocessAgent flags $beatImage as lastFrame instead of resolving it from imageRefs", async () => {
  const context = createMockContext();
  const beat = createMockBeat({
    imagePrompt: "Travis, the robot and the ship in one shot",
    moviePrompt: "An artist's hand draws the linework",
    movieParams: { firstFrameImageName: "blank_paper", lastFrameImageName: "$beatImage", frameFillColor: "#F7F6F4" },
  });

  const result = await imagePreprocessAgent({ context, beat, index: 0, imageRefs: { blank_paper: "/test/images/blank.png" } });

  assert.strictEqual((result as { lastFrameIsBeatImage?: boolean }).lastFrameIsBeatImage, true);
  assert.strictEqual((result as { lastFrameImagePath?: string }).lastFrameImagePath, undefined);
  assert.strictEqual((result as { frameFillColor?: string }).frameFillColor, "#F7F6F4");
});

test("imagePreprocessAgent rejects $beatImage on both frames", async () => {
  const context = createMockContext();
  const beat = createMockBeat({
    imagePrompt: "a scene",
    moviePrompt: "a movie",
    movieParams: { firstFrameImageName: "$beatImage", lastFrameImageName: "$beatImage" },
  });
  await assert.rejects(imagePreprocessAgent({ context, beat, index: 0, imageRefs: {} }), /\$beatImage cannot be used for both/);
});

test("imagePreprocessAgent rejects $beatImage when the beat produces no image of its own", async () => {
  const context = createMockContext();
  const movieOnly = createMockBeat({ moviePrompt: "a movie", movieParams: { lastFrameImageName: "$beatImage" } });
  await assert.rejects(imagePreprocessAgent({ context, beat: movieOnly, index: 0, imageRefs: {} }), /requires the beat to have an imagePrompt or image/);

  const movieImage = createMockBeat({
    image: { type: "movie", source: { kind: "path", path: "./clip.mp4" } },
    moviePrompt: "a movie",
    movieParams: { lastFrameImageName: "$beatImage" },
  });
  await assert.rejects(imagePreprocessAgent({ context, beat: movieImage, index: 0, imageRefs: {} }), /cannot be used with image type "movie"/);
});

test("beatFrameResolverAgent passes preprocessor frame paths through for non-sentinel beats", async () => {
  const context = createMockContext();
  const beat = createMockBeat({});
  const result = await beatFrameResolverAgent({
    context,
    beat,
    index: 0,
    preprocessor: {
      imagePath: "/test/images/beat.png",
      firstFrameImagePath: "/test/images/first.png",
      lastFrameImagePath: "/test/images/last.png",
      referenceImageForMovie: "/test/images/first.png",
    },
  });
  assert.deepStrictEqual(result, {
    firstFrameImagePath: "/test/images/first.png",
    lastFrameImagePath: "/test/images/last.png",
    referenceImageForMovie: "/test/images/first.png",
  });
});

test("beatFrameResolverAgent conforms the beat image and uses it as the last frame", async () => {
  const { context, dir } = createTempContext();
  const beatImagePath = path.join(dir, "beat_image.png");
  await createSolidPng(beatImagePath, 1536, 1024); // gpt-image landscape size, canvas is 1280x720

  const result = await beatFrameResolverAgent({
    context,
    beat: createMockBeat({ id: "scene_09" }),
    index: 8,
    preprocessor: {
      imagePath: beatImagePath,
      firstFrameImagePath: path.join(dir, "blank.png"),
      lastFrameIsBeatImage: true,
      frameFillColor: "#F7F6F4",
      referenceImageForMovie: path.join(dir, "blank.png"),
    },
  });

  assert.match(path.basename(result.lastFrameImagePath ?? ""), /^scene_09_beatImage_fit_1280x720_[0-9a-f]{8}\.png$/);
  const { width, height } = await ffmpegGetImageDimensions(result.lastFrameImagePath as string);
  assert.strictEqual(width, 1280);
  assert.strictEqual(height, 720);
  // first frame and movie start image are untouched
  assert.strictEqual(result.firstFrameImagePath, path.join(dir, "blank.png"));
  assert.strictEqual(result.referenceImageForMovie, path.join(dir, "blank.png"));

  fs.rmSync(dir, { recursive: true, force: true });
});

test("beatFrameResolverAgent uses the conformed beat image as the movie start for a firstFrame sentinel", async () => {
  const { context, dir } = createTempContext();
  const beatImagePath = path.join(dir, "beat_image.png");
  await createSolidPng(beatImagePath, 640, 360); // matches canvas aspect: conform returns the original

  const result = await beatFrameResolverAgent({
    context,
    beat: createMockBeat({}),
    index: 2,
    preprocessor: {
      imagePath: beatImagePath,
      firstFrameIsBeatImage: true,
      lastFrameImagePath: path.join(dir, "final.png"),
      referenceImageForMovie: beatImagePath,
    },
  });

  assert.strictEqual(result.firstFrameImagePath, beatImagePath);
  assert.strictEqual(result.referenceImageForMovie, beatImagePath);
  assert.strictEqual(result.lastFrameImagePath, path.join(dir, "final.png"));

  fs.rmSync(dir, { recursive: true, force: true });
});
