#!/usr/bin/env npx tsx
/**
 * Calculate and update timing for vocab-lesson beats that have Japanese text fade-in.
 *
 * Detects beats with `anim.animate('#ja-block', ...)` or `anim.animate('#tr...', ...)`
 * in their animation script, and adjusts:
 *   - duration = audio_length + ja_padding
 *   - Japanese fade-in start = audio_length + ja_gap
 *
 * Usage:
 *   npx tsx .claude/skills/vocab-lesson/calc_lesson_timing.ts <script.json> [options]
 *
 * Options:
 *   --ja-padding <seconds>  Total extra time after audio for Japanese display (default: 4.0)
 *   --ja-gap <seconds>      Gap between audio end and Japanese fade-in (default: 0.5)
 *   --fade-duration <seconds>  Duration of fade-in animation (default: 0.5)
 *   --dry-run               Show calculations without modifying file
 *
 * Prerequisites:
 *   Run `yarn audio <script.json>` first to generate audio files and studio JSON.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";

const DEFAULT_JA_PADDING = 4.0;
const DEFAULT_JA_GAP = 0.5;
const DEFAULT_FADE_DURATION = 0.5;

interface Options {
  scriptPath: string;
  jaPadding: number;
  jaGap: number;
  fadeDuration: number;
  dryRun: boolean;
}

interface JaFadeInBeat {
  beatIdx: number;
  beatId: string;
  targetId: string; // e.g., "ja-block", "tr1"
}

function roundUp1(x: number): number {
  return Math.ceil(x * 10) / 10;
}

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`, {
      encoding: "utf-8",
    });
    return parseFloat(result.trim());
  } catch {
    console.error(`  WARNING: Failed to get duration for: ${filePath}`);
    return 0;
  }
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    scriptPath: "",
    jaPadding: DEFAULT_JA_PADDING,
    jaGap: DEFAULT_JA_GAP,
    fadeDuration: DEFAULT_FADE_DURATION,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--ja-padding":
        options.jaPadding = parseFloat(args[++i]);
        break;
      case "--ja-gap":
        options.jaGap = parseFloat(args[++i]);
        break;
      case "--fade-duration":
        options.fadeDuration = parseFloat(args[++i]);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        printUsage();
        process.exit(0);
        break;
      default:
        if (!options.scriptPath && !args[i].startsWith("--")) {
          options.scriptPath = args[i];
        }
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage: npx tsx .claude/skills/vocab-lesson/calc_lesson_timing.ts <script.json> [options]

Options:
  --ja-padding <seconds>     Extra time after audio for Japanese display (default: ${DEFAULT_JA_PADDING})
  --ja-gap <seconds>         Gap between audio end and Japanese fade-in (default: ${DEFAULT_JA_GAP})
  --fade-duration <seconds>  Duration of fade-in animation (default: ${DEFAULT_FADE_DURATION})
  --dry-run                  Show calculations without modifying file
  --help                     Show this help

Example:
  yarn audio my-scripts/test_vocab_animation_word.json
  npx tsx .claude/skills/vocab-lesson/calc_lesson_timing.ts my-scripts/test_vocab_animation_word.json
  yarn movie my-scripts/test_vocab_animation_word.json
`);
}

/**
 * Find beats that have Japanese fade-in animation in their script.
 * Matches: anim.animate('#ja-block', ...) or anim.animate('#tr1', ...) etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findJaFadeInBeats(beats: any[]): JaFadeInBeat[] {
  const results: JaFadeInBeat[] = [];
  const pattern = /anim\.animate\(\s*'#(ja-block|tr\d+)'/;

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    if (!beat.image?.script) continue;

    const scriptLines: string[] = Array.isArray(beat.image.script) ? beat.image.script : [beat.image.script];
    for (const line of scriptLines) {
      const match = line.match(pattern);
      if (match) {
        results.push({
          beatIdx: i,
          beatId: beat.id || `beat${i}`,
          targetId: match[1],
        });
        break;
      }
    }
  }

  return results;
}

/**
 * Update the start/end values in anim.animate() call within the script array.
 */
function updateAnimateTimingInScript(
  scriptLines: string[],
  targetId: string,
  newStart: number,
  newEnd: number,
): boolean {
  const escapedId = targetId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(anim\\.animate\\(\\s*'#${escapedId}'[^)]*start:\\s*)([\\d.]+)(,\\s*end:\\s*)([\\d.]+)`,
  );

  for (let i = 0; i < scriptLines.length; i++) {
    const match = scriptLines[i].match(pattern);
    if (match) {
      scriptLines[i] = scriptLines[i].replace(
        pattern,
        `$1${newStart.toFixed(1)}$3${newEnd.toFixed(1)}`,
      );
      return true;
    }
  }

  return false;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.scriptPath) {
    printUsage();
    process.exit(1);
  }

  if (!existsSync(options.scriptPath)) {
    console.error(`Script file not found: ${options.scriptPath}`);
    process.exit(1);
  }

  const script = JSON.parse(readFileSync(options.scriptPath, "utf-8"));

  // Derive studio JSON path
  const basename = path.basename(options.scriptPath, ".json");
  const lang = script.lang || "en";
  const studioPath = path.join("output", `${basename}_${lang}_studio.json`);

  if (!existsSync(studioPath)) {
    // Try without lang suffix
    const studioPathAlt = path.join("output", `${basename}_studio.json`);
    if (!existsSync(studioPathAlt)) {
      console.error(`Studio file not found: ${studioPath}`);
      console.error(`Run 'yarn audio ${options.scriptPath}' first.`);
      process.exit(1);
    }
  }

  const studioFile = existsSync(path.join("output", `${basename}_${lang}_studio.json`))
    ? path.join("output", `${basename}_${lang}_studio.json`)
    : path.join("output", `${basename}_studio.json`);

  const studio = JSON.parse(readFileSync(studioFile, "utf-8"));

  // Get audio durations for all beats
  console.log("=== Audio Durations ===");
  const audioDurations: number[] = [];
  for (let i = 0; i < studio.beats.length; i++) {
    const studioBeat = studio.beats[i];
    let duration = 0;

    if (studioBeat.audioFile && existsSync(studioBeat.audioFile)) {
      duration = getAudioDuration(studioBeat.audioFile);
    } else if (studioBeat.audioDuration) {
      duration = studioBeat.audioDuration;
    }

    audioDurations.push(duration);
    const id = script.beats[i]?.id || `beat${i}`;
    console.log(`  ${id}: ${duration.toFixed(3)}s`);
  }

  // Find beats with Japanese fade-in
  const jaBeats = findJaFadeInBeats(script.beats);

  if (jaBeats.length === 0) {
    console.log("\nNo beats with Japanese fade-in animation found.");
    process.exit(0);
  }

  console.log(`\nFound ${jaBeats.length} beat(s) with Japanese fade-in`);
  console.log(`  ja-padding: ${options.jaPadding}s, ja-gap: ${options.jaGap}s, fade: ${options.fadeDuration}s`);

  // Process each beat
  console.log("\n=== Timing Updates ===");
  for (const jaBeat of jaBeats) {
    const audioDuration = audioDurations[jaBeat.beatIdx];
    const oldDuration = script.beats[jaBeat.beatIdx].duration;
    const newDuration = roundUp1(audioDuration + options.jaPadding);
    const jaFadeStart = roundUp1(audioDuration + options.jaGap);
    const jaFadeEnd = roundUp1(jaFadeStart + options.fadeDuration);

    console.log(`  ${jaBeat.beatId}:`);
    console.log(`    audio     = ${audioDuration.toFixed(3)}s`);
    console.log(`    duration  = ${oldDuration ?? "(none)"}s → ${newDuration}s`);
    console.log(`    #${jaBeat.targetId} fade-in = ${jaFadeStart}s → ${jaFadeEnd}s`);

    if (!options.dryRun) {
      // Update duration
      script.beats[jaBeat.beatIdx].duration = newDuration;

      // Update fade-in timing in script
      const scriptLines = script.beats[jaBeat.beatIdx].image.script;
      if (Array.isArray(scriptLines)) {
        const updated = updateAnimateTimingInScript(scriptLines, jaBeat.targetId, jaFadeStart, jaFadeEnd);
        if (!updated) {
          console.warn(`    WARNING: Could not update timing for #${jaBeat.targetId}`);
        }
      }
    }
  }

  if (options.dryRun) {
    console.log("\n(dry-run: file not modified)");
    return;
  }

  writeFileSync(options.scriptPath, JSON.stringify(script, null, 2) + "\n");
  console.log(`\nUpdated: ${options.scriptPath}`);
}

main();
