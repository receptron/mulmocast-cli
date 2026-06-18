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

export class UsageCollector {
  private readonly records: UsageRecord[] = [];

  add(record: Omit<UsageRecord, "timestamp"> & { timestamp?: string }): void {
    this.records.push({ ...record, timestamp: record.timestamp ?? new Date().toISOString() });
  }

  snapshot(): UsageRecord[] {
    return this.records.slice();
  }

  merge(other: UsageCollector): void {
    other.snapshot().forEach((record) => this.records.push(record));
  }

  clear(): void {
    this.records.length = 0;
  }

  get size(): number {
    return this.records.length;
  }
}
