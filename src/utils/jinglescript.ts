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

// Every JingleScript score of the script: a beat's voice (beat.audio) and its sound effects, each
// with where it is, for error messages.
export const getJingleScores = (context: MulmoStudioContext) => {
  return context.studio.script.beats.flatMap((beat, beatIndex) => [
    ...(beat.audio?.type === "jinglescript" ? [{ score: beat.audio.score, beatIndex, location: `beats[${beatIndex}].audio.score` }] : []),
    ...(beat.soundEffects ?? []).flatMap((soundEffect, effectIndex) =>
      soundEffect.source.kind === "jinglescript"
        ? [{ score: soundEffect.source.score, beatIndex, location: `beats[${beatIndex}].soundEffects[${effectIndex}].source.score` }]
        : [],
    ),
  ]);
};

// The JingleScript scores of the script, or of one beat only.
const jingleScoresOf = (context: MulmoStudioContext, beatIndex?: number) =>
  getJingleScores(context).filter((jingle) => beatIndex === undefined || jingle.beatIndex === beatIndex);

// Checks the JingleScript scores of the script, or of one beat; throws listing every problem with its location.
export const validateJingleScores = (context: MulmoStudioContext, beatIndex?: number) => {
  const problems = jingleScoresOf(context, beatIndex).flatMap(({ score, location }) =>
    checkScore(score).errors.map((problem) => `${location}: ${formatProblem(problem).trim()}`),
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

// Renders a score; a failure (NEUTRINO not installed, say) names where the score is.
const renderAt = async (score: ReturnType<typeof parseScore>, samples: Awaited<ReturnType<typeof loadSamples>>, location: string) => {
  try {
    return await render(score, { sampleRate: JINGLE_SAMPLE_RATE, samples });
  } catch (error) {
    throw new Error(`${location}: failed to render the JingleScript score: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};

// Renders the JingleScript scores of the script, or of one beat (`beatIndex`: the per-beat audio
// API), to WAV files, skipping cached ones unless forced.
// A problem in another beat does not stop a beat rendered on its own.
export const renderJingleScores = async (context: MulmoStudioContext, beatIndex?: number) => {
  validateJingleScores(context, beatIndex);
  for (const { score, location } of jingleScoresOf(context, beatIndex)) {
    const filePath = getJingleFilePath(score, context);
    if (!context.force && fs.existsSync(filePath)) {
      continue;
    }
    const parsed = parseScore(score);
    const samples = await loadJingleSamples(parsed, location);
    // jinglescript renders on a worker thread (1.0); a track with `sing` runs the user's NEUTRINO there.
    const { audio, sampleRate } = await renderAt(parsed, samples, location);
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
