import type Replicate from "replicate";
import type { Prediction } from "replicate";

// Capture Replicate's exact billed seconds (`metrics.predict_time`) via the
// progress callback on `replicate.run()`. Avoids switching the four
// replicate agents from `.run()` to `predictions.create()` + poll, which
// would be a much bigger blast radius.
export const runReplicateWithMetrics = async (
  replicate: Replicate,
  identifier: `${string}/${string}` | `${string}/${string}:${string}`,
  input: object,
  signal?: AbortSignal,
): Promise<{ output: unknown; predictSec?: number }> => {
  let lastPrediction: Prediction | undefined;
  const output = await replicate.run(identifier, { input, signal }, (prediction) => {
    lastPrediction = prediction;
  });
  return { output, predictSec: lastPrediction?.metrics?.predict_time };
};
