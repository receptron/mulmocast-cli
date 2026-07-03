// Probe: compare estimateUsage() predictions against the actual usage recorded
// by a real generation run, aggregated per provider:model.
//
// Procedure:
//   1. Run an action with usage dumping enabled:
//        MULMOCAST_DUMP_USAGE=/tmp/usage_audio.json yarn cli audio script.json -o /tmp/out -l en
//   2. Compare against the estimator:
//        npx tsx scripts/probe/probe_estimate_vs_actual.ts script.json /tmp/usage_audio.json
//
// Optional env:
//   ESTIMATE_LANGS=en,ja         (audio languages passed to estimateUsage)
//   ESTIMATE_TARGET_LANGS=ja     (translate targets passed to estimateUsage)

import fs from "fs";
import path from "path";
import { estimateUsage } from "../../src/utils/estimate_usage.js";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import type { UsageRecord, UsageEstimate } from "../../src/types/usage.js";

type MetricTotals = { inputChars: number; inputTokens: number; outputTokens: number; predictSec: number; records: number };

const emptyTotals = (): MetricTotals => ({ inputChars: 0, inputTokens: 0, outputTokens: 0, predictSec: 0, records: 0 });

const addEstimate = (totals: MetricTotals, record: UsageEstimate) => {
  totals.inputChars += record.inputChars?.value ?? 0;
  totals.inputTokens += record.inputTokens?.value ?? 0;
  totals.outputTokens += record.outputTokens?.value ?? 0;
  totals.predictSec += record.predictSec?.value ?? 0;
  totals.records += 1;
};

const addActual = (totals: MetricTotals, record: UsageRecord) => {
  totals.inputChars += record.inputChars ?? 0;
  totals.inputTokens += record.inputTokens ?? 0;
  totals.outputTokens += record.outputTokens ?? 0;
  totals.predictSec += record.predictSec ?? 0;
  totals.records += 1;
};

const groupTotals = <T>(records: T[], key: (r: T) => string, add: (totals: MetricTotals, record: T) => void): Map<string, MetricTotals> => {
  const groups = new Map<string, MetricTotals>();
  records.forEach((record) => {
    const totals = groups.get(key(record)) ?? emptyTotals();
    add(totals, record);
    groups.set(key(record), totals);
  });
  return groups;
};

const deltaLabel = (estimateValue: number, actualValue: number): string => {
  if (estimateValue === 0 && actualValue === 0) {
    return "-";
  }
  if (actualValue === 0) {
    return "n/a";
  }
  const deltaPercent = ((estimateValue - actualValue) / actualValue) * 100;
  return `${deltaPercent >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`;
};

const main = () => {
  const [scriptArg, dumpArg] = process.argv.slice(2);
  if (!scriptArg || !dumpArg) {
    console.error("Usage: npx tsx scripts/probe/probe_estimate_vs_actual.ts <script.json> <usage_dump.json>");
    process.exit(1);
  }
  const script = mulmoScriptSchema.parse(JSON.parse(fs.readFileSync(path.resolve(scriptArg), "utf8")));
  const dump = JSON.parse(fs.readFileSync(path.resolve(dumpArg), "utf8")) as { snapshot: UsageRecord[] };

  const langs = process.env.ESTIMATE_LANGS?.split(",");
  const targetLangs = process.env.ESTIMATE_TARGET_LANGS?.split(",");
  const estimates = estimateUsage(script, { langs, targetLangs });

  // The API reports dated snapshot names (gpt-4o-2024-08-06) while the estimator uses
  // the requested alias (gpt-4o) — strip the date suffix so the groups join.
  const normalizeModel = (model: string) => model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const estimateGroups = groupTotals(estimates, (r) => `${r.provider}:${normalizeModel(r.model)}`, addEstimate);
  const actualGroups = groupTotals(dump.snapshot, (r) => `${r.provider}:${normalizeModel(r.model)}`, addActual);

  // Only compare provider:model groups the run actually exercised — a dump from
  // a single action (e.g. audio) doesn't cover the estimator's other processes.
  const keys = [...actualGroups.keys()].sort();
  const metrics: (keyof Omit<MetricTotals, "records">)[] = ["inputChars", "inputTokens", "outputTokens", "predictSec"];
  console.log("| provider:model | metric | estimated | actual | delta |");
  console.log("|---|---|---|---|---|");
  keys.forEach((key) => {
    const estimate = estimateGroups.get(key) ?? emptyTotals();
    const actual = actualGroups.get(key) ?? emptyTotals();
    metrics.forEach((metricName) => {
      if (estimate[metricName] === 0 && actual[metricName] === 0) {
        return;
      }
      console.log(`| ${key} | ${metricName} | ${estimate[metricName]} | ${actual[metricName]} | ${deltaLabel(estimate[metricName], actual[metricName])} |`);
    });
  });
};

main();
