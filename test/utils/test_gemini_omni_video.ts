import test from "node:test";
import assert from "node:assert";
import {
  GEMINI_OMNI_MAX_SEGMENT_SEC,
  GEMINI_OMNI_MAX_TOTAL_SEC,
  GEMINI_OMNI_MIN_SEGMENT_SEC,
  buildGeminiOmniVideoRequest,
  geminiOmniAspectRatio,
  geminiOmniExtensionPrompt,
  geminiOmniSegments,
  geminiOmniTotalSec,
  isGeminiOmniVideoModel,
  videoFromInteraction,
  type GeminiOmniVideoRequest,
} from "../../src/utils/gemini_omni_video.js";
import { generateGeminiOmniVideo, movieGenAIAgent, type GeminiOmniVideoClient } from "../../src/agents/movie_genai_agent.js";
import { agentCallContext } from "../fixtures.js";
import { provider2MovieAgent } from "../../src/types/provider2agent.js";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

test("isGeminiOmniVideoModel: the omni models only", () => {
  ["gemini-omni-1.1-flash", "gemini-omni-flash-preview", provider2MovieAgent.google.defaultModel].forEach((model) =>
    assert.strictEqual(isGeminiOmniVideoModel(model), true, model),
  );
  ["veo-3.1-generate-001", "gemini-3.8-flash", "", "omni"].forEach((model) => assert.strictEqual(isGeminiOmniVideoModel(model), false, model));
});

test("geminiOmniSegments: one call up to 10s, then even extensions; whole seconds, none under 3", () => {
  assert.deepStrictEqual(
    [1, 3, 3.2, 8, 10, 10.5, 11, 20, 21, 29, 30, 31, 40, 41, 100].map((sec) => [sec, geminiOmniSegments(sec)]),
    [
      [1, [3]],
      [3, [3]],
      [3.2, [4]],
      [8, [8]],
      [10, [10]],
      [10.5, [6, 5]],
      [11, [6, 5]],
      [20, [10, 10]],
      [21, [7, 7, 7]],
      [29, [10, 10, 9]],
      [30, [10, 10, 10]],
      [31, [8, 8, 8, 7]],
      [40, [10, 10, 10, 10]],
      [41, [10, 10, 10, 10]],
      [100, [10, 10, 10, 10]],
    ],
  );
});

test("geminiOmniSegments: every length from 0 to 50 in quarter seconds keeps the API's bounds and adds up to the total", () => {
  Array.from({ length: 201 }, (_, index) => index / 4).forEach((sec) => {
    const segments = geminiOmniSegments(sec);
    segments.forEach((segment) => {
      assert.ok(Number.isInteger(segment), `${sec}: ${segment}`);
      assert.ok(segment >= GEMINI_OMNI_MIN_SEGMENT_SEC && segment <= GEMINI_OMNI_MAX_SEGMENT_SEC, `${sec}: ${segment}`);
    });
    assert.strictEqual(sum(segments), geminiOmniTotalSec(sec), String(sec));
    assert.ok(geminiOmniTotalSec(sec) >= Math.min(sec, GEMINI_OMNI_MAX_TOTAL_SEC), String(sec));
  });
});

test("geminiOmniTotalSec: a non-finite length is an error, not a NaN request", () => {
  [NaN, Infinity, -Infinity].forEach((sec) => assert.throws(() => geminiOmniTotalSec(sec), RangeError));
});

test("geminiOmniAspectRatio: the nearer of 16:9 and 9:16", () => {
  assert.strictEqual(geminiOmniAspectRatio({ width: 1280, height: 720 }), "16:9");
  assert.strictEqual(geminiOmniAspectRatio({ width: 720, height: 1280 }), "9:16");
  assert.strictEqual(geminiOmniAspectRatio({ width: 1200, height: 1000 }), "16:9");
  assert.strictEqual(geminiOmniAspectRatio({ width: 1000, height: 1000 }), "9:16");
});

test("buildGeminiOmniVideoRequest: text only, frames before the prompt, and an extension", () => {
  const base = { model: "gemini-omni-1.1-flash", prompt: "a boat", aspectRatio: "16:9", durationSec: 7 };
  const responseFormat = { type: "video", aspect_ratio: "16:9", resolution: "720p", duration: "7s" };
  assert.deepStrictEqual(buildGeminiOmniVideoRequest(base), { model: base.model, input: "a boat", response_format: responseFormat });
  const first = { data: "AAA", mime_type: "image/png" };
  const last = { data: "BBB", mime_type: "image/png" };
  assert.deepStrictEqual(buildGeminiOmniVideoRequest({ ...base, frames: [first, last] }).input, [
    { type: "image", ...first },
    { type: "image", ...last },
    { type: "text", text: "a boat" },
  ]);
  assert.deepStrictEqual(buildGeminiOmniVideoRequest({ ...base, previousInteractionId: "v1_x" }), {
    model: base.model,
    input: "a boat",
    previous_interaction_id: "v1_x",
    response_format: responseFormat,
  });
});

test("videoFromInteraction: MP4 bytes, or an error", () => {
  assert.deepStrictEqual(videoFromInteraction({ data: Buffer.from("mp4").toString("base64"), mime_type: "video/mp4" }), Buffer.from("mp4"));
  assert.throws(() => videoFromInteraction(undefined), /No video data/);
  assert.throws(() => videoFromInteraction({ mime_type: "video/mp4" }), /No video data/);
  assert.throws(() => videoFromInteraction({ data: "AAA", mime_type: "video/webm" }), /video\/webm, expected video\/mp4/);
  assert.throws(() => videoFromInteraction({ data: "AAA" }), /unknown type/);
});

const fakeClient = (options: { omitIdAt?: number } = {}) => {
  const calls: { params: GeminiOmniVideoRequest; timeout?: number }[] = [];
  const client: GeminiOmniVideoClient = {
    interactions: {
      create: async (params, requestOptions) => {
        const index = calls.length;
        calls.push({ params, timeout: requestOptions?.timeout });
        const data = Buffer.from(`video-${index}`).toString("base64");
        return { id: index === options.omitIdAt ? undefined : `id-${index}`, output_video: { data, mime_type: "video/mp4" } };
      },
    },
  };
  return { client, calls };
};

const input = { model: "gemini-omni-1.1-flash", prompt: "a boat", aspectRatio: "16:9" };
const first = { data: "FIRST", mime_type: "image/png" };
const last = { data: "LAST", mime_type: "image/png" };

test("generateGeminiOmniVideo: a short beat is one call with both frames", async () => {
  const { client, calls } = fakeClient();
  const video = await generateGeminiOmniVideo(client, { ...input, requestedSec: 6, firstFrame: first, lastFrame: last });
  assert.deepStrictEqual(video, Buffer.from("video-0"));
  assert.deepStrictEqual(
    calls.map((call) => call.params),
    [buildGeminiOmniVideoRequest({ ...input, durationSec: 6, frames: [first, last] })],
  );
  assert.ok(typeof calls[0].timeout === "number");
});

test("generateGeminiOmniVideo: a long beat extends the previous interaction and keeps the last answer", async () => {
  const { client, calls } = fakeClient();
  const video = await generateGeminiOmniVideo(client, { ...input, requestedSec: 21, firstFrame: first, lastFrame: last });
  assert.deepStrictEqual(video, Buffer.from("video-2"));
  assert.deepStrictEqual(
    calls.map((call) => call.params),
    [
      buildGeminiOmniVideoRequest({ ...input, durationSec: 7, frames: [first] }),
      buildGeminiOmniVideoRequest({ ...input, prompt: geminiOmniExtensionPrompt("a boat"), durationSec: 7, previousInteractionId: "id-0" }),
      buildGeminiOmniVideoRequest({ ...input, prompt: geminiOmniExtensionPrompt("a boat"), durationSec: 7, previousInteractionId: "id-1" }),
    ],
  );
});

test("generateGeminiOmniVideo: a text-only beat sends no frames", async () => {
  const { client, calls } = fakeClient();
  await generateGeminiOmniVideo(client, { ...input, requestedSec: 4 });
  assert.strictEqual(calls[0].params.input, "a boat");
});

test("generateGeminiOmniVideo: an answer with no id cannot be extended", async () => {
  const { client, calls } = fakeClient({ omitIdAt: 0 });
  await assert.rejects(() => generateGeminiOmniVideo(client, { ...input, requestedSec: 15 }), /no interaction id/);
  assert.strictEqual(calls.length, 1);
});

test("movieGenAIAgent: a removed model is rejected before any API call, with the unsupported-model cause", async () => {
  await assert.rejects(
    () =>
      movieGenAIAgent({
        ...agentCallContext,
        namedInputs: { prompt: "a boat", movieFile: "/nonexistent/out.mov" },
        params: { model: "veo-3.1-generate-preview", canvasSize: { width: 1280, height: 720 } },
        config: { apiKey: "fake-key-not-used" },
      }),
    (error: Error) =>
      /"veo-3\.1-generate-preview" is not supported/.test(error.message) &&
      JSON.stringify(error.cause).includes("unsupportedModel") &&
      JSON.stringify(error.cause).includes("movieGenAIAgent"),
  );
});
