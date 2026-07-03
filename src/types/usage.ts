// Minimal usage info an agent attaches to its result. The collector callback
// expands this into a full UsageRecord by adding context (beatIndex, retry, etc).
export type AgentUsage = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  predictSec?: number;
  inputChars?: number;
};

export type UsageRecord = {
  agent: string;
  provider: string;
  model: string;
  beatIndex?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  predictSec?: number;
  inputChars?: number;
  cached: boolean;
  retryAttempt?: number;
  timestamp: string;
};

export type UsageCollectorAPI = {
  add(record: Omit<UsageRecord, "timestamp"> & { timestamp?: string }): void;
  snapshot(): UsageRecord[];
  merge(other: UsageCollectorAPI): void;
  clear(): void;
  readonly size: number;
};

// Pre-run estimates. Field names mirror UsageRecord so an estimate can be
// compared with the actuals collected at runtime.
export type EstimatePrecision = "exact" | "estimated";

export type EstimatedMetric = {
  value: number;
  precision: EstimatePrecision;
};

export type UsageEstimateProcess = "tts" | "image" | "htmlImage" | "movie" | "soundEffect" | "lipSync" | "translate" | "imageReference" | "movieReference";

export type UsageEstimate = {
  process: UsageEstimateProcess;
  beatIndex?: number;
  refKey?: string;
  lang?: string;
  provider: string;
  model: string;
  inputTokens?: EstimatedMetric;
  outputTokens?: EstimatedMetric;
  inputChars?: EstimatedMetric;
  predictSec?: EstimatedMetric;
  imageCount?: EstimatedMetric;
  costUSD?: number;
  pricingAsOf?: string;
};
