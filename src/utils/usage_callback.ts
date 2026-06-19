import { NodeState, type CallbackFunction, type TransactionLog } from "graphai";
import type { MulmoStudioContext } from "../types/type.js";
import type { AgentUsage } from "../types/usage.js";

// @graphai/* LLM agents (openAIAgent / geminiAgent / anthropicAgent / groqAgent)
// return usage in the OpenAI chat-completions wire shape:
//   { prompt_tokens, completion_tokens, total_tokens }
// without provider/model on the usage object. We derive provider from the
// node's agentId and model from the node's params or the spread response.
const LLM_AGENT_TO_PROVIDER: Record<string, string> = {
  openAIAgent: "openai",
  geminiAgent: "google",
  anthropicAgent: "anthropic",
  groqAgent: "groq",
};

const isAgentUsage = (value: unknown): value is AgentUsage => {
  if (!value || typeof value !== "object") return false;
  const { provider, model } = value as { provider?: unknown; model?: unknown };
  return typeof provider === "string" && typeof model === "string";
};

const extractLLMUsage = (log: TransactionLog): AgentUsage | undefined => {
  const provider = log.agentId ? LLM_AGENT_TO_PROVIDER[log.agentId] : undefined;
  if (!provider) return undefined;
  const result = log.result as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; model?: unknown } | undefined;
  const u = result?.usage;
  if (!u || typeof u.prompt_tokens !== "number" || typeof u.total_tokens !== "number") return undefined;
  const pickModel = (): string => {
    const fromParams = (log.params as { model?: unknown } | undefined)?.model;
    if (typeof fromParams === "string") return fromParams;
    if (typeof result?.model === "string") return result.model;
    return "unknown";
  };
  const model = pickModel();
  return {
    provider,
    model,
    inputTokens: u.prompt_tokens,
    outputTokens: u.completion_tokens,
    totalTokens: u.total_tokens,
  };
};

const extractUsage = (log: TransactionLog): AgentUsage | undefined => {
  // 1. mulmocast AgentUsage shape (image/TTS agents in this repo).
  if (log.result && typeof log.result === "object") {
    const { usage } = log.result as { usage?: unknown };
    if (isAgentUsage(usage)) return usage;
  }
  // 2. @graphai/* LLM shape — derive provider/model from log metadata.
  return extractLLMUsage(log);
};

// GraphAI callback that pushes any agent's reported usage into
// context.usageCollector when the node completes successfully. No-op when
// usageCollector is absent, the node fails, or the result has no `usage`.
export const createUsageCallback = (context: MulmoStudioContext): CallbackFunction => {
  return (log: TransactionLog, isUpdate: boolean) => {
    if (isUpdate) return;
    if (log.state !== NodeState.Completed) return;
    if (!context.usageCollector) return;
    const usage = extractUsage(log);
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
