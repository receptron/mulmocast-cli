#!/usr/bin/env npx tsx
/**
 * Calculate and update voiceover timing for MulmoScripts with voice_over beats.
 *
 * Automatically detects voice_over groups: an animated html_tailwind beat
 * (with `var showAt = [...]` in its script) followed by consecutive voice_over beats.
 * Supports multiple groups in a single script (e.g., mixed beat structures).
 *
 * Usage:
 *   npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts <script.json> [options]
 *
 * Options:
 *   --translation-delay <seconds>  Delay for translation text appearance (default: 0 = no translation)
 *   --gap <seconds>                Gap between messages (default: 0.3)
 *   --dry-run                      Show calculations without modifying file
 *
 * Prerequisites:
 *   Run `yarn audio <script.json>` first to generate audio files and studio JSON.
 *
 * What it does:
 *   1. Reads studio JSON to get audio durations (via ffprobe)
 *   2. Finds voice_over groups (animated parent + consecutive voice_over beats)
 *   3. Calculates startAt for each voice_over beat within each group
 *   4. Calculates showAt frames for animation
 *   5. Optionally calculates showAtJa frames for translation timing
 *   6. Sets duration on each parent animated beat
 *   7. Updates the script JSON in-place
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";

// Constants
const FPS = 30; // frames per second
const DEFAULT_GAP = 0.3; // seconds gap between messages
const FIRST_SHOW_AT_DELAY = 1.0; // seconds — visual delay for first message (independent of audioParams)

// Default audioParams (matching MulmoCast defaults in schema.ts)
const DEFAULT_INTRO_PADDING = 1.0;
const DEFAULT_OUTRO_PADDING = 1.0;

/**
 * Round up to 1 decimal place.
 * roundUp1(3.14) = 3.2, roundUp1(3.10) = 3.1, roundUp1(3.01) = 3.1
 */
function roundUp1(x: number): number {
  return Math.ceil(x * 10) / 10;
}

/**
 * Get audio duration in seconds using ffprobe.
 */
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

interface Options {
  scriptPath: string;
  translationDelay: number;
  gap: number;
  dryRun: boolean;
}

interface AudioPadding {
  introPadding: number;
  outroPadding: number;
}

interface VoiceOverGroup {
  parentIdx: number;
  voiceOverIndices: number[];
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    scriptPath: "",
    translationDelay: 0,
    gap: DEFAULT_GAP,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--translation-delay":
        options.translationDelay = parseFloat(args[++i]);
        break;
      case "--gap":
        options.gap = parseFloat(args[++i]);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAudioPadding(script: any): AudioPadding {
  return {
    introPadding: script.audioParams?.introPadding ?? DEFAULT_INTRO_PADDING,
    outroPadding: script.audioParams?.outroPadding ?? DEFAULT_OUTRO_PADDING,
  };
}

function printUsage() {
  console.log(`Usage: npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts <script.json> [options]

Options:
  --translation-delay <seconds>  Delay for translation text appearance (default: 0)
  --gap <seconds>                Gap between messages (default: 0.3)
  --dry-run                      Show calculations without modifying file
  --help                         Show this help

Beat position handling:
  - First beat:  firstShowAtDelay = audioParams.introPadding (default: 1.0s)
  - Middle beat: firstShowAtDelay = 0
  - Last beat:   duration += audioParams.outroPadding (default: 1.0s)
  Reads audioParams from the script JSON (falls back to MulmoCast defaults).

Example:
  # Basic (English only)
  yarn audio my-scripts/test_vocab_chat_voiceover_word.json
  npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts my-scripts/test_vocab_chat_voiceover_word.json
  yarn movie my-scripts/test_vocab_chat_voiceover_word.json

  # With translation delay (1 second after English)
  npx tsx .claude/skills/vocab-chat/calc_voiceover_timing.ts my-scripts/test_vocab_chat_voiceover_word.json --translation-delay 1.0
`);
}

/**
 * Check if a beat is an animated html_tailwind beat with `var showAt` in its HTML.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isVoiceOverParent(beat: any): boolean {
  if (beat.image?.type !== "html_tailwind" || !beat.image?.animation) {
    return false;
  }
  // Check both html array and script field for `var showAt`
  const html = Array.isArray(beat.image.html) ? beat.image.html : [beat.image.html];
  if (html.some((line: string) => /var showAt\s*=\s*\[/.test(line))) {
    return true;
  }
  if (beat.image.script) {
    const script = Array.isArray(beat.image.script) ? beat.image.script : [beat.image.script];
    return script.some((line: string) => /var showAt\s*=\s*\[/.test(line));
  }
  return false;
}

/**
 * Find voice_over groups in the script.
 * A group = animated html_tailwind parent (with showAt) + consecutive voice_over beats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findVoiceOverGroups(beats: any[]): VoiceOverGroup[] {
  const groups: VoiceOverGroup[] = [];
  let i = 0;
  while (i < beats.length) {
    if (isVoiceOverParent(beats[i])) {
      const voiceOverIndices: number[] = [];
      let j = i + 1;
      while (j < beats.length && beats[j].image?.type === "voice_over") {
        voiceOverIndices.push(j);
        j++;
      }
      if (voiceOverIndices.length > 0) {
        groups.push({ parentIdx: i, voiceOverIndices });
      }
      i = j;
      continue;
    }
    i++;
  }
  return groups;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllAudioDurations(studio: any, scriptBeats: any[]): number[] {
  const durations: number[] = [];

  for (let i = 0; i < studio.beats.length; i++) {
    const studioBeat = studio.beats[i];

    // Try ffprobe on audio file first
    if (studioBeat.audioFile && existsSync(studioBeat.audioFile)) {
      durations.push(getAudioDuration(studioBeat.audioFile));
      continue;
    }

    // Fallback: use audioDuration from studio JSON (available after movie generation)
    if (studioBeat.audioDuration) {
      durations.push(studioBeat.audioDuration);
      continue;
    }

    console.error(`  WARNING: No audio found for beat ${i} (${scriptBeats[i]?.id || "unknown"})`);
    durations.push(0);
  }

  return durations;
}

function calculateGroupStartAt(groupDurations: number[], gap: number): (number | null)[] {
  const startAtValues: (number | null)[] = [null]; // parent beat has no startAt
  let cumulative = groupDurations[0] + gap;

  for (let i = 1; i < groupDurations.length; i++) {
    const startAt = roundUp1(cumulative);
    startAtValues.push(startAt);
    cumulative = startAt + groupDurations[i] + gap;
  }

  return startAtValues;
}

function calculateGroupShowAtFrames(startAtValues: (number | null)[], firstShowAtDelay: number): number[] {
  const frames: number[] = [];

  // First message appears at firstShowAtDelay
  frames.push(Math.round(firstShowAtDelay * FPS));

  for (let i = 1; i < startAtValues.length; i++) {
    frames.push(Math.round(startAtValues[i]! * FPS));
  }

  return frames;
}

function calculateGroupDuration(startAtValues: (number | null)[], groupDurations: number[], gap: number): number {
  const lastIdx = startAtValues.length - 1;
  const lastStartAt = startAtValues[lastIdx]!;
  return roundUp1(lastStartAt + groupDurations[lastIdx] + gap);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateHtmlShowAt(htmlArray: string[], showAtFrames: number[], showAtJaFrames: number[] | null): void {
  for (let i = 0; i < htmlArray.length; i++) {
    // Update showAt array
    if (/var showAt\s*=\s*\[/.test(htmlArray[i])) {
      htmlArray[i] = htmlArray[i].replace(/var showAt\s*=\s*\[[\d\s,]*\]/, `var showAt = [${showAtFrames.join(", ")}]`);

      // Handle showAtJa
      if (showAtJaFrames) {
        // Check if next line already has showAtJa
        if (i + 1 < htmlArray.length && /var showAtJa\s*=\s*\[/.test(htmlArray[i + 1])) {
          htmlArray[i + 1] = htmlArray[i + 1].replace(
            /var showAtJa\s*=\s*\[[\d\s,]*\]/,
            `var showAtJa = [${showAtJaFrames.join(", ")}]`,
          );
        } else {
          // Insert showAtJa line after showAt
          htmlArray.splice(i + 1, 0, `  var showAtJa = [${showAtJaFrames.join(", ")}];`);
        }
      }
      break;
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.scriptPath) {
    printUsage();
    process.exit(1);
  }

  // Read script JSON
  if (!existsSync(options.scriptPath)) {
    console.error(`Script file not found: ${options.scriptPath}`);
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(options.scriptPath, "utf-8"));

  // Derive studio JSON path
  const basename = path.basename(options.scriptPath, ".json");
  const studioPath = path.join("output", `${basename}_studio.json`);

  if (!existsSync(studioPath)) {
    console.error(`Studio file not found: ${studioPath}`);
    console.error(`Run 'yarn audio ${options.scriptPath}' first.`);
    process.exit(1);
  }

  const studio = JSON.parse(readFileSync(studioPath, "utf-8"));

  // Read audioParams from script (with MulmoCast defaults)
  const audioPadding = getAudioPadding(script);
  console.log(`=== Audio Padding (from script) ===`);
  console.log(`  introPadding: ${audioPadding.introPadding}s, outroPadding: ${audioPadding.outroPadding}s`);

  // Get all audio durations
  console.log("\n=== Audio Durations ===");
  const allDurations = getAllAudioDurations(studio, script.beats);
  allDurations.forEach((d, i) => {
    const id = script.beats[i]?.id || `beat${i}`;
    console.log(`  ${id}: ${d.toFixed(3)}s`);
  });

  // Find voice_over groups
  const groups = findVoiceOverGroups(script.beats);

  if (groups.length === 0) {
    console.error("\nNo voice_over groups found. Expected at least one animated html_tailwind beat with `var showAt` followed by voice_over beats.");
    process.exit(1);
  }

  console.log(`\nFound ${groups.length} voice_over group(s)`);
  const totalBeatCount = script.beats.length;

  // Process each group
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const groupIndices = [group.parentIdx, ...group.voiceOverIndices];
    const groupDurations = groupIndices.map((idx) => allDurations[idx]);
    const parentId = script.beats[group.parentIdx]?.id || `beat${group.parentIdx}`;

    // Detect beat position for padding adjustment
    const isFirstBeat = group.parentIdx === 0;
    const lastGroupBeatIdx = group.voiceOverIndices[group.voiceOverIndices.length - 1];
    const isLastBeat = lastGroupBeatIdx === totalBeatCount - 1;

    if (groups.length > 1) {
      console.log(`\n--- Group ${g + 1}: ${parentId} (${groupIndices.length} beats) ---`);
    }

    // firstShowAtDelay: visual offset for first beat (independent of audioParams)
    const firstShowAtDelay = isFirstBeat ? FIRST_SHOW_AT_DELAY : 0;

    // Calculate startAt values within the group
    const startAtValues = calculateGroupStartAt(groupDurations, options.gap);

    // Calculate total duration for this group
    const totalDuration = calculateGroupDuration(startAtValues, groupDurations, options.gap);

    console.log("\n=== Timing ===");
    if (isFirstBeat || isLastBeat) {
      const flags = [isFirstBeat ? "first" : "", isLastBeat ? "last" : ""].filter(Boolean).join("+");
      console.log(`  position: ${flags} beat → firstShowAtDelay=${firstShowAtDelay}s`);
      if (isFirstBeat || isLastBeat) {
        console.log(`  WARNING: voice_over group is at ${flags} position. Consider adding intro/closing beats to handle audio padding.`);
      }
    }
    groupIndices.forEach((beatIdx, j) => {
      const id = script.beats[beatIdx]?.id || `beat${beatIdx}`;
      console.log(`  ${id}: startAt = ${startAtValues[j] !== null ? startAtValues[j]!.toFixed(1) : "(parent beat)"}`);
    });
    console.log(`  duration = ${totalDuration}s`);

    // Calculate showAt frames
    const showAtFrames = calculateGroupShowAtFrames(startAtValues, firstShowAtDelay);

    console.log("\n=== Animation Frames ===");
    console.log(`  showAt   = [${showAtFrames.join(", ")}]`);

    // Calculate translation showAt if needed
    let showAtJaFrames: number[] | null = null;
    if (options.translationDelay > 0) {
      const delayFrames = Math.round(options.translationDelay * FPS);
      showAtJaFrames = showAtFrames.map((f) => f + delayFrames);
      console.log(`  showAtJa = [${showAtJaFrames.join(", ")}]  (delay: ${options.translationDelay}s = ${delayFrames} frames)`);

      // Validate no overlap with next message
      for (let i = 0; i < showAtJaFrames.length - 1; i++) {
        if (showAtJaFrames[i] >= showAtFrames[i + 1]) {
          console.warn(
            `  WARNING: Translation for beat ${i + 1} (frame ${showAtJaFrames[i]}) overlaps with beat ${i + 2} (frame ${showAtFrames[i + 1]})`,
          );
        }
      }
    }

    if (!options.dryRun) {
      // 1. Set duration on parent beat
      script.beats[group.parentIdx].duration = totalDuration;

      // 2. Set startAt on voice_over beats
      group.voiceOverIndices.forEach((beatIdx, j) => {
        script.beats[beatIdx].image.startAt = startAtValues[j + 1];
      });

      // 3. Update showAt (and showAtJa) in parent's animation HTML or script
      const html = script.beats[group.parentIdx].image?.html;
      const scriptField = script.beats[group.parentIdx].image?.script;
      if (Array.isArray(scriptField)) {
        updateHtmlShowAt(scriptField, showAtFrames, showAtJaFrames);
      } else if (Array.isArray(html)) {
        updateHtmlShowAt(html, showAtFrames, showAtJaFrames);
      }
    }
  }

  if (options.dryRun) {
    console.log("\n(dry-run: file not modified)");
    return;
  }

  // Write back
  writeFileSync(options.scriptPath, JSON.stringify(script, null, 2) + "\n");
  console.log(`\nUpdated: ${options.scriptPath}`);
}

main();
