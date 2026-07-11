import type Replicate from "replicate";
import type { Prediction } from "replicate";
import { REPLICATE_RUN_TIMEOUT_MS } from "./sdk_timeout.js";

// Capture Replicate's exact billed seconds (`metrics.predict_time`) via the
// progress callback on `replicate.run()`. Avoids switching the four
// replicate agents from `.run()` to `predictions.create()` + poll, which
// would be a much bigger blast radius.
//
// A timeout aborts the run so a stalled job rejects (and the caller's GraphAI
// `retry` can recover) instead of hanging forever. An optional caller `signal`
// is composed with the timeout so upstream cancellation still works.
export const runReplicateWithMetrics = async (
  replicate: Replicate,
  identifier: `${string}/${string}` | `${string}/${string}:${string}`,
  input: object,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<{ output: unknown; predictSec?: number }> => {
  const { timeoutMs = REPLICATE_RUN_TIMEOUT_MS, signal: externalSignal } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  let lastPrediction: Prediction | undefined;
  try {
    const output = await replicate.run(identifier, { input, signal: controller.signal }, (prediction) => {
      lastPrediction = prediction;
    });
    return { output, predictSec: lastPrediction?.metrics?.predict_time };
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
};
