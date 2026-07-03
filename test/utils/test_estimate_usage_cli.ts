import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateUsage, actionEstimateProcesses } from "../../src/utils/estimate_usage.js";
import { formatUsageEstimates } from "../../src/utils/estimate_usage_format.js";
import { mulmoScriptSchema } from "../../src/types/schema.js";
import type { UsageEstimate } from "../../src/types/usage.js";

const fullScript = mulmoScriptSchema.parse({
  $mulmocast: { version: "1.1" },
  lang: "en",
  captionParams: { lang: "ja" },
  speechParams: { speakers: { Presenter: { voiceId: "shimmer", displayName: { en: "Presenter" } } } },
  beats: [
    { speaker: "Presenter", text: "Hello world", imagePrompt: "a cat" },
    { speaker: "Presenter", text: "Movie beat", moviePrompt: "a wave", duration: 5 },
  ],
});

const processesOf = (records: UsageEstimate[]) => [...new Set(records.map((r) => r.process))].sort();

describe("estimateUsage: processes option", () => {
  it("returns all records when processes is undefined", () => {
    assert.deepEqual(processesOf(estimateUsage(fullScript)), ["image", "movie", "translate", "tts"]);
  });

  it("filters records to the given processes", () => {
    const records = estimateUsage(fullScript, { processes: ["tts"] });
    assert.deepEqual(processesOf(records), ["tts"]);
    assert.equal(records.length, 2);
  });

  it("returns nothing for an empty processes list", () => {
    assert.equal(estimateUsage(fullScript, { processes: [] }).length, 0);
  });
});

describe("estimateUsage: actionEstimateProcesses scoping", () => {
  it("audio scope covers tts and translate but no visuals", () => {
    const records = estimateUsage(fullScript, { processes: actionEstimateProcesses.audio });
    assert.deepEqual(processesOf(records), ["translate", "tts"]);
  });

  it("images scope covers visuals and translate but no tts", () => {
    const records = estimateUsage(fullScript, { processes: actionEstimateProcesses.images });
    assert.deepEqual(processesOf(records), ["image", "movie", "translate"]);
  });

  it("movie scope covers everything the pipeline runs", () => {
    const records = estimateUsage(fullScript, { processes: actionEstimateProcesses.movie });
    assert.deepEqual(processesOf(records), ["image", "movie", "translate", "tts"]);
  });

  it("translate scope covers only translate", () => {
    const records = estimateUsage(fullScript, { processes: actionEstimateProcesses.translate });
    assert.deepEqual(processesOf(records), ["translate"]);
  });
});

describe("formatUsageEstimates", () => {
  it("renders grouped rows, estimate markers, and a total line", () => {
    const output = formatUsageEstimates(estimateUsage(fullScript));
    assert.ok(output.includes("| process | provider:model |"));
    assert.ok(output.includes("| tts | openai:gpt-4o-mini-tts |"));
    assert.ok(output.includes("~")); // heuristic metrics are marked
    assert.ok(/Total estimated cost: ≈ \$\d+\.\d{4}/.test(output));
    assert.ok(output.includes("prices as of"));
  });

  it("notes records without pricing data", () => {
    const script = mulmoScriptSchema.parse({
      $mulmocast: { version: "1.1" },
      lang: "en",
      speechParams: { speakers: { Presenter: { voiceId: "Atla", provider: "kotodama", displayName: { en: "Presenter" } } } },
      beats: [{ speaker: "Presenter", text: "Hello" }],
    });
    const output = formatUsageEstimates(estimateUsage(script, { targetLangs: [] }));
    assert.ok(output.includes("without pricing data"));
  });

  it("handles empty input", () => {
    assert.equal(formatUsageEstimates([]), "No billable API usage estimated.");
  });
});
