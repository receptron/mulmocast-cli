import { createHash } from "node:crypto";
import { REMOTION_REVIEW_MARKER, REMOTION_SYSTEM_PROMPT } from "./system_prompt.js";

export const REMOTION_COMPONENT_FILE = "Generated.tsx";
export const REMOTION_ENTRY_FILE = "index.tsx";
export const REMOTION_COMPOSITION_ID = "Beat";

export type RemotionSceneSpec = {
  prompt: string;
  narration?: string;
  brief?: string;
  position?: { index: number; count: number };
  fps: number;
  width: number;
  height: number;
};

// No user/project settings: the reply depends only on these prompts, and hooks, plugins and MCP
// servers neither run nor add their context to every call. Writing needs no tools; review reads images.
export const buildClaudeArgs = (userPrompt: string, systemPrompt: string = REMOTION_SYSTEM_PROMPT, tools: string = ""): string[] => [
  "-p",
  userPrompt,
  "--system-prompt",
  systemPrompt,
  "--tools",
  tools,
  ...(tools ? ["--allowedTools", tools] : []),
  "--setting-sources",
  "",
  "--strict-mcp-config",
  "--output-format",
  "json",
  "--no-session-persistence",
];

export const buildScenePrompt = (spec: RemotionSceneSpec): string =>
  [
    ...(spec.brief ? [`Art direction for the whole video (every scene follows it exactly, so they look like one film): ${spec.brief}`, ""] : []),
    ...(spec.position ? [`This is scene ${spec.position.index + 1} of ${spec.position.count}.`, ""] : []),
    spec.prompt,
    "",
    ...(spec.narration ? [`Narration spoken over this scene: ${spec.narration}`, ""] : []),
    `Canvas: ${spec.width}x${spec.height} pixels at ${spec.fps} fps.`,
  ].join("\n");

export const buildRepairPrompt = (spec: RemotionSceneSpec, code: string, error: string): string =>
  [
    buildScenePrompt(spec),
    "",
    "Your previous component failed to bundle or render. Fix it and reply with the whole corrected component.",
    "",
    "Error:",
    error,
    "",
    "Previous component:",
    "```tsx",
    code,
    "```",
  ].join("\n");

export type ReviewFrame = { fraction: number; file: string };

export const buildReviewPrompt = (spec: RemotionSceneSpec, code: string, frames: ReviewFrame[]): string =>
  [
    buildScenePrompt(spec),
    "",
    "Rendered frames of your component (read each image file):",
    ...frames.map((frame) => `- at ${Math.round(frame.fraction * 100)}% of the scene: ${frame.file}`),
    "",
    "Your component:",
    "```tsx",
    code,
    "```",
  ].join("\n");

// undefined means the reviewer approved the scene as it is.
export const parseReviewReply = (replyText: string): string | undefined => {
  if (replyText.trim() === REMOTION_REVIEW_MARKER) return undefined;
  return extractTsx(replyText);
};

export const remotionCacheKey = (spec: RemotionSceneSpec, systemPrompt: string = REMOTION_SYSTEM_PROMPT): string =>
  createHash("sha256")
    .update(
      JSON.stringify([spec.prompt, spec.narration ?? "", spec.brief ?? "", spec.position ?? null, spec.fps, spec.width, spec.height, systemPrompt]),
      "utf8",
    )
    .digest("hex");

const CODE_BLOCK_PATTERN = /```(?:tsx|typescript|ts|jsx)?[ \t]*\r?\n([\s\S]*?)```/;

export const extractTsx = (replyText: string): string | undefined => {
  const match = CODE_BLOCK_PATTERN.exec(replyText);
  const code = match ? match[1] : replyText;
  return code.includes("export default") ? code.trim() + "\n" : undefined;
};

type ClaudeJsonReply = { result: string; is_error?: boolean };

const isClaudeJsonReply = (value: unknown): value is ClaudeJsonReply =>
  typeof value === "object" && value !== null && "result" in value && typeof value.result === "string";

export const parseClaudeReply = (stdout: string): ClaudeJsonReply => {
  const parsed: unknown = JSON.parse(stdout);
  if (!isClaudeJsonReply(parsed)) {
    throw new Error(`claude -p returned JSON without a "result" string: ${stdout.slice(0, 200)}`);
  }
  if (parsed.is_error) {
    throw new Error(`claude -p reported an error: ${parsed.result}`);
  }
  return parsed;
};

export const buildEntrySource = (): string =>
  [
    'import React from "react";',
    'import { Composition, registerRoot } from "remotion";',
    `import Scene from "./${REMOTION_COMPONENT_FILE.replace(/\.tsx$/, "")}";`,
    "",
    "type SceneProps = { durationInFrames: number; fps: number; width: number; height: number };",
    "",
    "const Root: React.FC = () => (",
    "  <Composition",
    `    id="${REMOTION_COMPOSITION_ID}"`,
    "    component={Scene}",
    "    durationInFrames={1}",
    "    fps={30}",
    "    width={1280}",
    "    height={720}",
    "    defaultProps={{ durationInFrames: 1, fps: 30, width: 1280, height: 720 }}",
    "    calculateMetadata={({ props }: { props: SceneProps }) => ({",
    "      durationInFrames: props.durationInFrames,",
    "      fps: props.fps,",
    "      width: props.width,",
    "      height: props.height,",
    "    })}",
    "  />",
    ");",
    "",
    "registerRoot(Root);",
    "",
  ].join("\n");
