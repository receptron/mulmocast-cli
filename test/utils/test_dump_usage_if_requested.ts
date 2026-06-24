import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { dumpUsageIfRequested } from "../../src/cli/helpers.js";
import { UsageCollector } from "../../src/utils/usage_collector.js";
import type { MulmoStudioContext } from "../../src/types/type.js";

const makeContext = (collector?: UsageCollector): MulmoStudioContext =>
  ({
    usageCollector: collector,
  }) as unknown as MulmoStudioContext;

const withEnv = (value: string | undefined, fn: () => void) => {
  const previous = process.env.MULMOCAST_DUMP_USAGE;
  if (value === undefined) delete process.env.MULMOCAST_DUMP_USAGE;
  else process.env.MULMOCAST_DUMP_USAGE = value;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.MULMOCAST_DUMP_USAGE;
    else process.env.MULMOCAST_DUMP_USAGE = previous;
  }
};

test("dumpUsageIfRequested: no-op when env var unset", () => {
  withEnv(undefined, () => {
    const collector = new UsageCollector();
    collector.add({ agent: "x", provider: "openai", model: "m", totalTokens: 10, cached: false });
    assert.doesNotThrow(() => dumpUsageIfRequested(makeContext(collector)));
  });
});

test("dumpUsageIfRequested: writes JSON to file when path is provided", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dump-usage-"));
  const target = path.join(tmp, "usage.json");
  withEnv(target, () => {
    const collector = new UsageCollector();
    collector.add({ agent: "ttsOpenaiAgent", provider: "openai", model: "tts-1", inputChars: 20, cached: false });
    collector.add({
      agent: "imageGenAIAgent",
      provider: "google",
      model: "gemini-2.5-flash-image",
      inputTokens: 27,
      outputTokens: 1290,
      totalTokens: 1317,
      cached: false,
    });
    dumpUsageIfRequested(makeContext(collector));
  });
  assert.ok(fs.existsSync(target), "file should be written");
  const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
  assert.strictEqual(parsed.records, 2);
  assert.strictEqual(parsed.byModel.length, 2);
  assert.strictEqual(parsed.snapshot.length, 2);
  const openai = parsed.byModel.find((g: { provider: string }) => g.provider === "openai");
  assert.strictEqual(openai.inputChars, 20);
  const google = parsed.byModel.find((g: { provider: string }) => g.provider === "google");
  assert.strictEqual(google.totalTokens, 1317);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("dumpUsageIfRequested: groups multiple records of the same provider:model", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dump-usage-"));
  const target = path.join(tmp, "usage.json");
  withEnv(target, () => {
    const collector = new UsageCollector();
    for (let i = 0; i < 4; i += 1) {
      collector.add({
        agent: "imageGenAIAgent",
        provider: "google",
        model: "gemini-2.5-flash-image",
        inputTokens: 27,
        outputTokens: 1290,
        totalTokens: 1317,
        cached: false,
      });
    }
    dumpUsageIfRequested(makeContext(collector));
  });
  const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
  assert.strictEqual(parsed.records, 4);
  assert.strictEqual(parsed.byModel.length, 1, "same provider:model collapses into one byModel entry");
  assert.strictEqual(parsed.byModel[0].records, 4);
  assert.strictEqual(parsed.byModel[0].totalTokens, 1317 * 4);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("dumpUsageIfRequested: empty snapshot still produces a valid file", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dump-usage-"));
  const target = path.join(tmp, "usage.json");
  withEnv(target, () => {
    dumpUsageIfRequested(makeContext(new UsageCollector()));
  });
  const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
  assert.strictEqual(parsed.records, 0);
  assert.deepStrictEqual(parsed.byModel, []);
  assert.deepStrictEqual(parsed.snapshot, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("dumpUsageIfRequested: no collector → records 0, no crash", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dump-usage-"));
  const target = path.join(tmp, "usage.json");
  withEnv(target, () => {
    dumpUsageIfRequested(makeContext(undefined));
  });
  const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
  assert.strictEqual(parsed.records, 0);
  fs.rmSync(tmp, { recursive: true, force: true });
});
