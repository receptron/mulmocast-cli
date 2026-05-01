import test from "node:test";
import assert from "node:assert";
import type { GraphAI } from "graphai";
import { movieReplicateAgent } from "../../src/agents/movie_replicate_agent.js";

const baseParams = {
  config: { apiKey: "fake-key-not-used" },
  filterParams: {},
  debugInfo: {
    verbose: false,
    nodeId: "",
    state: "",
    retry: 0,
    subGraphs: new Map<string, GraphAI>(),
  },
};

const canvasSize = { width: 1024, height: 1024 };

test("movieReplicateAgent throws when start_image_required model is called without imagePath", async () => {
  await assert.rejects(
    () =>
      movieReplicateAgent({
        ...baseParams,
        namedInputs: { prompt: "test prompt", movieFile: "unused-movie-file.mp4" },
        params: { model: "minimax/hailuo-2.3-fast", canvasSize, duration: 6 },
      }),
    (err: Error) => err.message.includes("requires a start image"),
    "expected i2v-only validation error",
  );
});

test("movieReplicateAgent passes the start_image_required gate when imagePath is provided", async () => {
  // Same i2v-only model, but with an imagePath supplied. The gate must let
  // execution proceed; readFileSync then fails on the bogus path, which proves
  // we got past the gate without hitting the Replicate API.
  await assert.rejects(
    () =>
      movieReplicateAgent({
        ...baseParams,
        namedInputs: {
          prompt: "test prompt",
          imagePath: "./nonexistent-test-image.png",
          movieFile: "unused-movie-file.mp4",
        },
        params: { model: "minimax/hailuo-2.3-fast", canvasSize, duration: 6 },
      }),
    (err: Error) => !err.message.includes("requires a start image"),
    "gate should pass when imagePath is provided; agent fails for an unrelated reason",
  );
});
