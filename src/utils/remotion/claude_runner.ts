import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildClaudeArgs, extractTsx, parseClaudeReply, parseReviewReply } from "./claude_prompt.js";
import { REMOTION_REVIEW_SYSTEM_PROMPT, REMOTION_SYSTEM_PROMPT } from "./system_prompt.js";

const execFileAsync = promisify(execFile);

const CLAUDE_COMMAND = "claude";
const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000;
const CLAUDE_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const REVIEW_TOOLS = "Read";

export type ComponentWriter = (userPrompt: string, workDir: string) => Promise<string>;
// Resolves to the improved component, or undefined when the reviewer approves the scene as it is.
export type ComponentReviewer = (userPrompt: string, workDir: string) => Promise<string | undefined>;

const describeFailure = (error: unknown, workDir: string): Error => {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`claude -p timed out after ${CLAUDE_TIMEOUT_MS}ms (workDir: ${workDir})`, { cause: error });
  }
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    return new Error(`"${CLAUDE_COMMAND}" was not found. The remotion beat needs Claude Code installed and logged in.`, { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Running "${CLAUDE_COMMAND} -p" failed (workDir: ${workDir}): ${message}`, { cause: error });
};

// Run from the beat's work directory so no project CLAUDE.md is picked up and the reviewer can read
// the frames there; stdin is closed so `claude -p` does not wait for piped input.
const runClaude = async (args: string[], workDir: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  try {
    const child = execFileAsync(CLAUDE_COMMAND, args, { cwd: workDir, signal: controller.signal, maxBuffer: CLAUDE_MAX_OUTPUT_BYTES });
    child.child.stdin?.end();
    const { stdout } = await child;
    return parseClaudeReply(stdout).result;
  } catch (error) {
    throw describeFailure(error, workDir);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const writeComponentWithClaude: ComponentWriter = async (userPrompt, workDir) => {
  const code = extractTsx(await runClaude(buildClaudeArgs(userPrompt, REMOTION_SYSTEM_PROMPT), workDir));
  if (!code) {
    throw new Error(`claude -p did not return a component with "export default" (workDir: ${workDir})`);
  }
  return code;
};

export const reviewComponentWithClaude: ComponentReviewer = async (userPrompt, workDir) => {
  return parseReviewReply(await runClaude(buildClaudeArgs(userPrompt, REMOTION_REVIEW_SYSTEM_PROMPT, REVIEW_TOOLS), workDir));
};
