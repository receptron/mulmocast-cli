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
