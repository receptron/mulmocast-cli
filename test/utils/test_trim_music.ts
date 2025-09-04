import { GraphAILogger } from "graphai";
import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

import { trimMusic } from "../../src/utils/ffmpeg_utils.js";

const TEST_AUDIO_URL = "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/morning001.mp3";

test("test trimMusic with valid audio URL", async () => {
  const startTime = 15;
  const duration = 5;

  const result = await trimMusic(TEST_AUDIO_URL, startTime, duration);

  assert(Buffer.isBuffer(result), "Should return a Buffer");
  assert(result.length > 0, "Buffer should not be empty");

  // Save trimmed music to output folder
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "trimmed.mp3");
  fs.writeFileSync(outputPath, result);

  GraphAILogger.info(`Trimmed music saved to: ${outputPath}`);
  assert(fs.existsSync(outputPath), "Output file should exist");
});

test("test trimMusic with invalid file path", async () => {
  const invalidPath = "/non/existent/file.mp3";
  const startTime = 0;
  const duration = 5;

  await assert.rejects(
    async () => {
      await trimMusic(invalidPath, startTime, duration);
    },
    /File not found/,
    "Should throw error for non-existent file",
  );
});

test("test trimMusic with invalid duration", async () => {
  const startTime = 0;
  const duration = -1;

  await assert.rejects(
    async () => {
      await trimMusic(TEST_AUDIO_URL, startTime, duration);
    },
    /Invalid duration/,
    "Should throw error for negative duration",
  );
});

test("test trimMusic with zero duration", async () => {
  const startTime = 0;
  const duration = 0;

  await assert.rejects(
    async () => {
      await trimMusic(TEST_AUDIO_URL, startTime, duration);
    },
    /Invalid duration/,
    "Should throw error for zero duration",
  );
});

test("test trimMusic with different start time", async () => {
  const startTime = 10;
  const duration = 3;

  const result = await trimMusic(TEST_AUDIO_URL, startTime, duration);

  assert(Buffer.isBuffer(result), "Should return a Buffer");
  assert(result.length > 0, "Buffer should not be empty");
});

test("test trimMusic with longer duration", async () => {
  const startTime = 5;
  const duration = 10;

  const result = await trimMusic(TEST_AUDIO_URL, startTime, duration);

  assert(Buffer.isBuffer(result), "Should return a Buffer");
  assert(result.length > 0, "Buffer should not be empty");
});
