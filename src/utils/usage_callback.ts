import { NodeState, type CallbackFunction, type TransactionLog } from "graphai";
import type { MulmoStudioContext } from "../types/type.js";
import type { AgentUsage } from "../types/usage.js";

const isAgentUsage = (value: unknown): value is AgentUsage => {
  if (!value || typeof value !== "object") return false;
  const { provider, model } = value as { provider?: unknown; model?: unknown };
  return typeof provider === "string" && typeof model === "string";
};

const extractUsage = (result: unknown): AgentUsage | undefined => {
  if (!result || typeof result !== "object") return undefined;
  const { usage } = result as { usage?: unknown };
  return isAgentUsage(usage) ? usage : undefined;
};

// GraphAI callback that pushes any agent's reported usage into
// context.usageCollector when the node completes successfully. No-op when
// usageCollector is absent, the node fails, or the result has no `usage`.
export const createUsageCallback = (context: MulmoStudioContext): CallbackFunction => {
  return (log: TransactionLog, isUpdate: boolean) => {
    if (isUpdate) return;
    if (log.state !== NodeState.Completed) return;
    if (!context.usageCollector) return;
    const usage = extractUsage(log.result);
    if (!usage) return;
    context.usageCollector.add({
      agent: log.agentId ?? "unknown",
      provider: usage.provider,
      model: usage.model,
      beatIndex: log.mapIndex,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      predictSec: usage.predictSec,
      inputChars: usage.inputChars,
      cached: false,
      retryAttempt: log.retryCount,
    });
  };
};
