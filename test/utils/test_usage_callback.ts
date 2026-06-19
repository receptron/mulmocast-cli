import test from "node:test";
import assert from "node:assert";
import { NodeState } from "graphai";

import { createUsageCallback } from "../../src/utils/usage_callback.js";
import { UsageCollector } from "../../src/utils/usage_collector.js";
import type { MulmoStudioContext } from "../../src/types/type.js";

const makeContext = (collector?: UsageCollector): MulmoStudioContext =>
  ({
    usageCollector: collector,
  }) as unknown as MulmoStudioContext;

const makeLog = (overrides: Record<string, unknown>): import("graphai").TransactionLog =>
  ({
    nodeId: "imageGenerator",
    state: NodeState.Completed,
    agentId: "imageOpenaiAgent",
    mapIndex: 0,
    retryCount: 0,
    ...overrides,
  }) as unknown as import("graphai").TransactionLog;

test("usage callback records a UsageRecord when agent returns usage", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  cb(
    makeLog({
      result: {
        buffer: Buffer.from(""),
        usage: { provider: "openai", model: "gpt-image-1", inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      },
    }),
    false,
  );
  const snap = collector.snapshot();
  assert.strictEqual(snap.length, 1);
  assert.strictEqual(snap[0].agent, "imageOpenaiAgent");
  assert.strictEqual(snap[0].provider, "openai");
  assert.strictEqual(snap[0].model, "gpt-image-1");
  assert.strictEqual(snap[0].beatIndex, 0);
  assert.strictEqual(snap[0].totalTokens, 300);
  assert.strictEqual(snap[0].cached, false);
});

test("usage callback ignores isUpdate=true (intermediate updates)", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  cb(
    makeLog({
      result: { usage: { provider: "openai", model: "m", totalTokens: 10 } },
    }),
    true,
  );
  assert.strictEqual(collector.size, 0);
});

test("usage callback ignores non-Completed states", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  for (const state of [NodeState.Failed, NodeState.TimedOut, NodeState.Abort, NodeState.Skipped, NodeState.Executing]) {
    cb(
      makeLog({
        state,
        result: { usage: { provider: "openai", model: "m", totalTokens: 10 } },
      }),
      false,
    );
  }
  assert.strictEqual(collector.size, 0);
});

test("usage callback ignores results without usage", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  cb(makeLog({ result: { buffer: Buffer.from("") } }), false);
  cb(makeLog({ result: undefined }), false);
  cb(makeLog({ result: "string-result" }), false);
  assert.strictEqual(collector.size, 0);
});

test("usage callback rejects malformed usage (missing provider/model)", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  cb(makeLog({ result: { usage: { totalTokens: 100 } } }), false);
  cb(makeLog({ result: { usage: { provider: "openai" } } }), false);
  cb(makeLog({ result: { usage: "garbage" } }), false);
  assert.strictEqual(collector.size, 0, "malformed usage must not be recorded");
});

test("usage callback is a no-op when context.usageCollector is undefined", () => {
  const cb = createUsageCallback(makeContext(undefined));
  // Should not throw.
  cb(
    makeLog({
      result: { usage: { provider: "openai", model: "m", totalTokens: 10 } },
    }),
    false,
  );
});

test("usage callback preserves retryAttempt from log.retryCount", () => {
  const collector = new UsageCollector();
  const cb = createUsageCallback(makeContext(collector));
  cb(
    makeLog({
      retryCount: 2,
      result: { usage: { provider: "openai", model: "m", totalTokens: 10 } },
    }),
    false,
  );
  assert.strictEqual(collector.snapshot()[0].retryAttempt, 2);
});
