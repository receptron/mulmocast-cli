import test from "node:test";
import assert from "node:assert";

import { UsageCollector } from "../../src/utils/usage_collector.js";

test("UsageCollector: empty snapshot", () => {
  const collector = new UsageCollector();
  assert.deepStrictEqual(collector.snapshot(), []);
  assert.strictEqual(collector.size, 0);
});

test("UsageCollector: add and snapshot", () => {
  const collector = new UsageCollector();
  collector.add({
    agent: "imageOpenaiAgent",
    provider: "openai",
    model: "gpt-image-1",
    beatIndex: 0,
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    cached: false,
  });
  const records = collector.snapshot();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].agent, "imageOpenaiAgent");
  assert.strictEqual(records[0].provider, "openai");
  assert.strictEqual(records[0].totalTokens, 300);
  assert.strictEqual(records[0].cached, false);
  assert.ok(records[0].timestamp, "timestamp should be auto-set");
});

test("UsageCollector: explicit timestamp is preserved", () => {
  const collector = new UsageCollector();
  const fixed = "2026-06-19T00:00:00.000Z";
  collector.add({
    agent: "imageGenAIAgent",
    provider: "google",
    model: "gemini-2.5-flash-image",
    cached: false,
    timestamp: fixed,
  });
  assert.strictEqual(collector.snapshot()[0].timestamp, fixed);
});

test("UsageCollector: snapshot returns a copy", () => {
  const collector = new UsageCollector();
  collector.add({ agent: "x", provider: "openai", model: "m", cached: false });
  const snap = collector.snapshot();
  snap.length = 0;
  assert.strictEqual(collector.size, 1, "mutating snapshot must not affect collector");
});

test("UsageCollector: merge", () => {
  const a = new UsageCollector();
  const b = new UsageCollector();
  a.add({ agent: "a1", provider: "openai", model: "m1", cached: false });
  b.add({ agent: "b1", provider: "google", model: "m2", cached: false });
  b.add({ agent: "b2", provider: "replicate", model: "m3", predictSec: 4.2, cached: false });
  a.merge(b);
  const snap = a.snapshot();
  assert.strictEqual(snap.length, 3);
  assert.deepStrictEqual(
    snap.map((r) => r.agent),
    ["a1", "b1", "b2"],
  );
});

test("UsageCollector: clear", () => {
  const collector = new UsageCollector();
  collector.add({ agent: "x", provider: "openai", model: "m", cached: false });
  collector.add({ agent: "y", provider: "openai", model: "m", cached: false });
  collector.clear();
  assert.strictEqual(collector.size, 0);
  assert.deepStrictEqual(collector.snapshot(), []);
});

test("UsageCollector: records mixed metric shapes", () => {
  const collector = new UsageCollector();
  collector.add({ agent: "llm", provider: "openai", model: "gpt-4", inputTokens: 50, outputTokens: 100, totalTokens: 150, cached: false });
  collector.add({ agent: "tts", provider: "openai", model: "tts-1", inputChars: 240, cached: false });
  collector.add({ agent: "replicate", provider: "replicate", model: "flux", predictSec: 12.5, cached: false });
  collector.add({ agent: "cached", provider: "openai", model: "gpt-4", cached: true });
  const records = collector.snapshot();
  assert.strictEqual(records.length, 4);
  assert.strictEqual(records[0].totalTokens, 150);
  assert.strictEqual(records[1].inputChars, 240);
  assert.strictEqual(records[2].predictSec, 12.5);
  assert.strictEqual(records[3].cached, true);
});
