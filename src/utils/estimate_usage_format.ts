// Human-readable rendering of UsageEstimate records: a table grouped by
// process × provider:model plus a total-cost line. Values whose precision is
// "estimated" are prefixed with "~".
import type { EstimatedMetric, UsageEstimate } from "../types/usage.js";

const METRIC_KEYS = ["inputTokens", "outputTokens", "inputChars", "predictSec", "imageCount"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

type MetricSum = { value: number; estimated: boolean; present: boolean };
type EstimateGroup = {
  process: string;
  model: string;
  metrics: Record<MetricKey, MetricSum>;
  costUSD: number;
  unpricedRecords: number;
  records: number;
};

const emptyGroup = (process: string, model: string): EstimateGroup => ({
  process,
  model,
  metrics: Object.fromEntries(METRIC_KEYS.map((key) => [key, { value: 0, estimated: false, present: false }])) as Record<MetricKey, MetricSum>,
  costUSD: 0,
  unpricedRecords: 0,
  records: 0,
});

const addMetric = (sum: MetricSum, metric: EstimatedMetric | undefined) => {
  if (!metric) {
    return;
  }
  sum.value += metric.value;
  sum.estimated = sum.estimated || metric.precision === "estimated";
  sum.present = true;
};

const buildGroups = (records: UsageEstimate[]): EstimateGroup[] => {
  const groups = new Map<string, EstimateGroup>();
  records.forEach((record) => {
    const key = `${record.process}|${record.provider}:${record.model}`;
    const group = groups.get(key) ?? emptyGroup(record.process, `${record.provider}:${record.model}`);
    METRIC_KEYS.forEach((metricKey) => addMetric(group.metrics[metricKey], record[metricKey]));
    group.costUSD += record.costUSD ?? 0;
    group.unpricedRecords += record.costUSD === undefined ? 1 : 0;
    group.records += 1;
    groups.set(key, group);
  });
  return [...groups.values()];
};

const metricCell = (sum: MetricSum): string => {
  if (!sum.present) {
    return "";
  }
  const marker = sum.estimated ? "~" : "";
  return `${marker}${Math.round(sum.value * 100) / 100}`;
};

const groupRow = (group: EstimateGroup): string => {
  const cells = [group.process, group.model, ...METRIC_KEYS.map((key) => metricCell(group.metrics[key])), group.costUSD > 0 ? group.costUSD.toFixed(4) : ""];
  return `| ${cells.join(" | ")} |`;
};

const totalLine = (groups: EstimateGroup[], records: UsageEstimate[]): string => {
  const totalCost = groups.reduce((sum, group) => sum + group.costUSD, 0);
  const unpriced = groups.reduce((sum, group) => sum + group.unpricedRecords, 0);
  const asOf = [...new Set(records.map((record) => record.pricingAsOf).filter((date): date is string => !!date))].sort()[0];
  const parts = [`Total estimated cost: ≈ $${totalCost.toFixed(4)}`];
  if (unpriced > 0) {
    parts.push(`(${unpriced} record(s) without pricing data)`);
  }
  if (asOf) {
    parts.push(`(prices as of ${asOf})`);
  }
  return parts.join(" ");
};

export const formatUsageEstimates = (records: UsageEstimate[]): string => {
  if (records.length === 0) {
    return "No billable API usage estimated.";
  }
  const groups = buildGroups(records);
  const header = "| process | provider:model | input tokens | output tokens | input chars | predict sec | images | cost (USD) |";
  const separator = "|---|---|---|---|---|---|---|---|";
  const note = "~ marks heuristic estimates; unmarked values are exact for the given script.";
  return [header, separator, ...groups.map(groupRow), "", totalLine(groups, records), note].join("\n");
};
