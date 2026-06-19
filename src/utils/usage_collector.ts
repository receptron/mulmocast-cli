import type { UsageRecord, UsageCollectorAPI } from "../types/usage.js";

export type { UsageRecord, UsageCollectorAPI } from "../types/usage.js";

export class UsageCollector implements UsageCollectorAPI {
  private readonly records: UsageRecord[] = [];

  add(record: Omit<UsageRecord, "timestamp"> & { timestamp?: string }): void {
    this.records.push({ ...record, timestamp: record.timestamp ?? new Date().toISOString() });
  }

  snapshot(): UsageRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  merge(other: UsageCollectorAPI): void {
    other.snapshot().forEach((record) => this.records.push({ ...record }));
  }

  clear(): void {
    this.records.length = 0;
  }

  get size(): number {
    return this.records.length;
  }
}
