// #1423 — verify that GraphAI's mapAgent propagates registered callbacks
// to nested child graphs, so createUsageCallback registered on the outer
// graph captures usage from agents that run inside per-row child graphs.
//
// The probe (scripts/probe/probe_usage.ts) already demonstrated this works
// end-to-end with the real OpenAI / Gemini image agents. This test pins
// the behavior so future graphai upgrades or refactors can't silently
// break the collector.

import test from "node:test";
import assert from "node:assert";
import { GraphAI } from "graphai";
import * as vanilla_agents from "@graphai/vanilla";

import { createUsageCallback } from "../../src/utils/usage_callback.js";
import { UsageCollector } from "../../src/utils/usage_collector.js";
import type { MulmoStudioContext } from "../../src/types/type.js";

const agents = { ...(vanilla_agents.default ?? vanilla_agents) };

const makeContext = (collector: UsageCollector): MulmoStudioContext => ({ usageCollector: collector }) as unknown as MulmoStudioContext;

// Inner graph: one node that just echoes a fake `usage` object so the
// callback sees a Completed result with the AgentUsage shape.
const beatGraph = {
  version: 0.5 as const,
  nodes: {
    row: {},
    fakeImageAgent: {
      agent: "copyAgent",
      inputs: {
        usage: {
          provider: "openai",
          model: "gpt-image-1",
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
        },
      },
      isResult: true,
    },
  },
};

const buildOuter = () => ({
  version: 0.5 as const,
  concurrency: 4,
  nodes: {
    rows: {},
    fanout: {
      agent: "mapAgent",
      inputs: { rows: ":rows" },
      params: { rowKey: "row", compositeResult: true },
      graph: beatGraph,
      isResult: true,
    },
  },
});

test("createUsageCallback receives records from nested mapAgent children", async () => {
  const collector = new UsageCollector();
  const graph = new GraphAI(buildOuter(), agents);
  graph.injectValue("rows", ["a", "b", "c"]);
  graph.registerCallback(createUsageCallback(makeContext(collector)));

  await graph.run();

  const snap = collector.snapshot();
  assert.strictEqual(snap.length, 3, "expected one record per inner row");
  for (const r of snap) {
    assert.strictEqual(r.provider, "openai");
    assert.strictEqual(r.model, "gpt-image-1");
    assert.strictEqual(r.totalTokens, 300);
    assert.strictEqual(r.cached, false);
  }
  // beatIndex comes from log.mapIndex which mapAgent sets per row.
  const indices = snap.map((r) => r.beatIndex).sort();
  assert.deepStrictEqual(indices, [0, 1, 2]);
});

test("nested callback also collects when outer graph has 12 rows (matches mulmocast beat count)", async () => {
  const collector = new UsageCollector();
  const graph = new GraphAI(buildOuter(), agents);
  graph.injectValue(
    "rows",
    Array.from({ length: 12 }, (_, i) => `r${i}`),
  );
  graph.registerCallback(createUsageCallback(makeContext(collector)));

  await graph.run();
  assert.strictEqual(collector.size, 12, "expected one usage record per beat");
});
