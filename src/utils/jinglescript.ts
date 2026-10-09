import fs from "fs";
import path from "path";
import { GraphAILogger } from "graphai";
import { checkScore, formatProblem, loadSamples, parseScore, render, toWav } from "jinglescript";
import type { MulmoStudioContext } from "../types/index.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { hashSHA256, mkdir } from "./file.js";
import { userAssert } from "./utils.js";

// The audio mix (addBGMAgent) runs at 44.1 kHz.
const JINGLE_SAMPLE_RATE = 44100;
// Per download of a recorded sample (grandpiano: about 1.2 MB per note).
const SAMPLE_FETCH_TIMEOUT_MS = 60000;

type JingleScore = Record<string, unknown>;

// Rendered jingles are cached by the hash of their score, so identical scores share one file.
export const getJingleFilePath = (score: JingleScore, context: MulmoStudioContext) => {
  return path.join(MulmoStudioContextMethods.getAudioDirPath(context), `jingle_${hashSHA256(JSON.stringify(score))}.wav`);
};

export const getJingleScores = (context: MulmoStudioContext) => {
  return context.studio.script.beats.flatMap((beat, beatIndex) =>
    (beat.soundEffects ?? []).flatMap((soundEffect, effectIndex) =>
      soundEffect.source.kind === "jinglescript" ? [{ score: soundEffect.source.score, beatIndex, effectIndex }] : [],
    ),
  );
};

// Checks every JingleScript score in the script; throws listing every problem with its location.
export const validateJingleScores = (context: MulmoStudioContext) => {
  const problems = getJingleScores(context).flatMap(({ score, beatIndex, effectIndex }) =>
    checkScore(score).errors.map((problem) => `beats[${beatIndex}].soundEffects[${effectIndex}].source.score: ${formatProblem(problem).trim()}`),
  );
  userAssert(problems.length === 0, `Invalid JingleScript score:\n${problems.join("\n")}`);
};

const fetchWithTimeout: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(SAMPLE_FETCH_TIMEOUT_MS) });

// Sampled instruments (grandpiano) play recordings that jinglescript downloads on first use and
// caches; a score without them loads nothing.
const loadJingleSamples = async (score: ReturnType<typeof parseScore>, location: string) => {
  try {
    return await loadSamples(score, { fetch: fetchWithTimeout });
  } catch (error) {
    throw new Error(`${location}: failed to load JingleScript samples: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};

// Renders the JingleScript scores of the script to WAV files (skipping cached ones unless forced).
export const renderJingleScores = async (context: MulmoStudioContext) => {
  validateJingleScores(context);
  for (const { score, beatIndex, effectIndex } of getJingleScores(context)) {
    const filePath = getJingleFilePath(score, context);
    if (!context.force && fs.existsSync(filePath)) {
      continue;
    }
    const parsed = parseScore(score);
    const samples = await loadJingleSamples(parsed, `beats[${beatIndex}].soundEffects[${effectIndex}].source.score`);
    const { audio, sampleRate } = render(parsed, { sampleRate: JINGLE_SAMPLE_RATE, samples });
    mkdir(path.dirname(filePath));
    writeFileAtomically(filePath, toWav(audio, sampleRate));
    GraphAILogger.info(`jinglescript: rendered ${filePath}`);
  }
};

// Writes to a temporary file next to the target, then renames it, so an interrupted write never
// leaves a partial WAV that a later run would take for a cached one.
export const writeFileAtomically = (filePath: string, data: Uint8Array) => {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
};
