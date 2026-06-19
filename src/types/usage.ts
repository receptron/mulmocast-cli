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
