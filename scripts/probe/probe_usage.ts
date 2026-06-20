// Probe: run a mulmocast action (images / audio / translate) against a test
// script and dump usageCollector contents.
//
// Usage:
//   OPENAI_API_KEY=sk-... npx tsx scripts/probe/probe_usage.ts
//
// Optional env:
//   USAGE_ACTION=images | audio | translate         (default: images)
//   USAGE_SCRIPT=scripts/test/test_gpt_image.json   (default depends on action)
//   USAGE_OUTDIR=/tmp/probe_usage_output             (default: per-action subdir)
//   USAGE_TARGET_LANG=ja                             (default: ja, translate only)

import path from "path";
import fs from "fs";
import { images, audio, translate } from "../../src/actions/index.js";
import { initializeContextFromFiles } from "../../src/utils/context.js";
import { getFileObject } from "../../src/cli/helpers.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const action = (process.env.USAGE_ACTION ?? "images") as "images" | "audio" | "translate";
const defaultScript: Record<typeof action, string> = {
  images: "scripts/test/test_gpt_image.json",
  audio: "scripts/test/test_all_tts.json",
  translate: "scripts/test/test_lang.json",
};
const scriptArg = process.env.USAGE_SCRIPT ?? defaultScript[action];
const scriptPath = path.resolve(repoRoot, scriptArg);
const outDir = process.env.USAGE_OUTDIR ?? `/tmp/probe_usage_${action}`;
const targetLang = process.env.USAGE_TARGET_LANG ?? "ja";

fs.mkdirSync(outDir, { recursive: true });

const main = async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY required");
    process.exit(1);
  }
  console.log(`action: ${action}`);
  console.log(`script: ${scriptPath}`);
  console.log(`outdir: ${outDir}`);

  const fileDirs = getFileObject({ file: scriptPath, outdir: outDir });
  const context = await initializeContextFromFiles(fileDirs, true, true, undefined, undefined, action === "translate" ? targetLang : undefined);
  if (!context) {
    console.error("context init failed");
    process.exit(1);
  }
  console.log(`beats: ${context.studio.script.beats.length}`);
  console.log(`collector initialized: ${Boolean(context.usageCollector)}`);

  const before = Date.now();
  if (action === "images") {
    await images(context);
  } else if (action === "audio") {
    await audio(context);
  } else if (action === "translate") {
    await translate(context);
  }
  const elapsedSec = (Date.now() - before) / 1000;

  const snap = context.usageCollector?.snapshot() ?? [];
  console.log("\n=== usage snapshot ===");
  console.log(JSON.stringify(snap, null, 2));

  // Group by provider:model — different models have different unit prices, so
  // billing has to be evaluated per (provider, model). Summing across models is
  // meaningless for cost.
  type Group = {
    provider: string;
    model: string;
    records: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    predictSec: number;
    inputChars: number;
  };
  const groups = new Map<string, Group>();
  for (const r of snap) {
    const key = `${r.provider}:${r.model}`;
    const g = groups.get(key) ?? {
      provider: r.provider,
      model: r.model,
      records: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      predictSec: 0,
      inputChars: 0,
    };
    g.records += 1;
    g.inputTokens += r.inputTokens ?? 0;
    g.outputTokens += r.outputTokens ?? 0;
    g.totalTokens += r.totalTokens ?? 0;
    g.predictSec += r.predictSec ?? 0;
    g.inputChars += r.inputChars ?? 0;
    groups.set(key, g);
  }

  console.log("\n=== totals (grouped by provider:model) ===");
  console.log(JSON.stringify({ elapsedSec, records: snap.length, byModel: Array.from(groups.values()) }, null, 2));

  if (snap.length === 0) {
    console.warn("\n⚠️  collector got 0 records — either every beat hit cache, or callback isn't firing.");
  }
};

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
