import test from "node:test";
import assert from "node:assert";
import { REMOTION_REVIEW_MARKER, REMOTION_SYSTEM_PROMPT } from "../../src/utils/remotion/system_prompt.js";
import {
  buildClaudeArgs,
  buildEntrySource,
  buildRepairPrompt,
  buildReviewPrompt,
  buildScenePrompt,
  extractTsx,
  parseClaudeReply,
  parseReviewReply,
  remotionCacheKey,
} from "../../src/utils/remotion/claude_prompt.js";

const spec = { prompt: "A title fades in", fps: 30, width: 1280, height: 720 };
const component = 'import React from "react";\nexport default function Scene() { return null; }';

test("buildClaudeArgs: prompt follows -p, no tools, no user settings, json output", () => {
  const args = buildClaudeArgs("show a chart");
  assert.strictEqual(args[args.indexOf("-p") + 1], "show a chart");
  assert.strictEqual(args[args.indexOf("--tools") + 1], "");
  assert.strictEqual(args[args.indexOf("--setting-sources") + 1], "");
  assert.strictEqual(args[args.indexOf("--output-format") + 1], "json");
  assert.strictEqual(args[args.indexOf("--system-prompt") + 1], REMOTION_SYSTEM_PROMPT);
  assert.ok(args.includes("--strict-mcp-config"));
  assert.ok(args.includes("--no-session-persistence"));
});

test("buildClaudeArgs: a custom system prompt replaces the default", () => {
  const args = buildClaudeArgs("x", "custom");
  assert.strictEqual(args[args.indexOf("--system-prompt") + 1], "custom");
});

test("buildClaudeArgs: no tools means no --allowedTools; named tools are also allowed", () => {
  assert.ok(!buildClaudeArgs("x").includes("--allowedTools"));
  const args = buildClaudeArgs("x", "review", "Read");
  assert.strictEqual(args[args.indexOf("--tools") + 1], "Read");
  assert.strictEqual(args[args.indexOf("--allowedTools") + 1], "Read");
});

test("buildReviewPrompt: lists every frame with its position and carries the code", () => {
  const prompt = buildReviewPrompt(spec, component, [
    { fraction: 0.3, file: "/w/review_0.png" },
    { fraction: 0.95, file: "/w/review_1.png" },
  ]);
  assert.ok(prompt.startsWith("A title fades in"));
  assert.ok(prompt.includes("at 30% of the scene: /w/review_0.png"));
  assert.ok(prompt.includes("at 95% of the scene: /w/review_1.png"));
  assert.ok(prompt.includes(component));
});

test("parseReviewReply: the marker approves, a component replaces, anything else approves", () => {
  assert.strictEqual(parseReviewReply(REMOTION_REVIEW_MARKER), undefined);
  assert.strictEqual(parseReviewReply(`  ${REMOTION_REVIEW_MARKER}\n`), undefined);
  assert.strictEqual(parseReviewReply("```tsx\n" + component + "\n```"), component + "\n");
  assert.strictEqual(parseReviewReply("Looks fine to me."), undefined);
});

test("buildScenePrompt: keeps the user prompt and states the canvas", () => {
  const prompt = buildScenePrompt(spec);
  assert.ok(prompt.startsWith("A title fades in"));
  assert.ok(prompt.includes("1280x720"));
  assert.ok(prompt.includes("30 fps"));
});

test("buildScenePrompt: includes the narration only when there is one", () => {
  assert.ok(buildScenePrompt({ ...spec, narration: "重さは100グラム" }).includes("Narration spoken over this scene: 重さは100グラム"));
  assert.ok(!buildScenePrompt(spec).includes("Narration"));
  assert.ok(!buildScenePrompt({ ...spec, narration: "" }).includes("Narration"));
});

test("buildScenePrompt: puts the whole-video art direction first when there is one", () => {
  const prompt = buildScenePrompt({ ...spec, brief: "navy and cyan, Inter" });
  assert.ok(prompt.startsWith("Art direction for the whole video"));
  assert.ok(prompt.includes("navy and cyan, Inter"));
  assert.ok(!buildScenePrompt(spec).includes("Art direction"));
});

test("buildScenePrompt: states the scene's place in the video when known", () => {
  assert.ok(buildScenePrompt({ ...spec, position: { index: 2, count: 6 } }).includes("This is scene 3 of 6."));
  assert.ok(!buildScenePrompt(spec).includes("This is scene"));
});

test("buildRepairPrompt: carries the scene, the error and the failing code", () => {
  const prompt = buildRepairPrompt(spec, component, "TS2304: Cannot find name 'foo'");
  assert.ok(prompt.startsWith("A title fades in"));
  assert.ok(prompt.includes("TS2304: Cannot find name 'foo'"));
  assert.ok(prompt.includes(component));
});

test("extractTsx: takes the code from a fenced block in any of the usual languages", () => {
  ["tsx", "typescript", "ts", "jsx", ""].forEach((lang) => {
    const reply = `Here you go:\n\`\`\`${lang}\n${component}\n\`\`\`\nDone.`;
    assert.strictEqual(extractTsx(reply), component + "\n", `lang=${lang}`);
  });
});

test("extractTsx: accepts CRLF after the fence", () => {
  assert.strictEqual(extractTsx("```tsx\r\n" + component + "\n```"), component + "\n");
});

test("extractTsx: takes a bare reply when it is the component itself", () => {
  assert.strictEqual(extractTsx(component), component + "\n");
});

test("extractTsx: rejects replies without a default export", () => {
  assert.strictEqual(extractTsx(""), undefined);
  assert.strictEqual(extractTsx("I cannot do that."), undefined);
  assert.strictEqual(extractTsx("```tsx\nconst x = 1;\n```"), undefined);
});

test("extractTsx: uses the first block when the reply has several", () => {
  const reply = "```tsx\n" + component + "\n```\n```tsx\nexport default 2;\n```";
  assert.strictEqual(extractTsx(reply), component + "\n");
});

test("parseClaudeReply: returns the result of a successful reply", () => {
  assert.strictEqual(parseClaudeReply(JSON.stringify({ result: "ok", is_error: false })).result, "ok");
});

test("parseClaudeReply: rejects an error reply, a reply without result, and non-JSON", () => {
  assert.throws(() => parseClaudeReply(JSON.stringify({ result: "rate limited", is_error: true })), /rate limited/);
  assert.throws(() => parseClaudeReply(JSON.stringify({ type: "result" })), /without a "result" string/);
  assert.throws(() => parseClaudeReply(JSON.stringify({ result: 3 })), /without a "result" string/);
  assert.throws(() => parseClaudeReply(JSON.stringify(null)), /without a "result" string/);
  assert.throws(() => parseClaudeReply("not json"));
});

test("remotionCacheKey: same inputs give the same key", () => {
  assert.strictEqual(remotionCacheKey({ ...spec }), remotionCacheKey({ ...spec }));
});

test("remotionCacheKey: changing any input changes the key", () => {
  const base = remotionCacheKey(spec);
  const variants = [
    remotionCacheKey({ ...spec, prompt: "A title slides in" }),
    remotionCacheKey({ ...spec, narration: "spoken words" }),
    remotionCacheKey({ ...spec, brief: "navy and cyan" }),
    remotionCacheKey({ ...spec, position: { index: 0, count: 6 } }),
    remotionCacheKey({ ...spec, fps: 24 }),
    remotionCacheKey({ ...spec, width: 720 }),
    remotionCacheKey({ ...spec, height: 1280 }),
    remotionCacheKey(spec, "another system prompt"),
  ];
  variants.forEach((key) => assert.notStrictEqual(key, base));
  assert.strictEqual(new Set(variants).size, variants.length);
});

test("buildEntrySource: registers the generated component with props-driven metadata", () => {
  const source = buildEntrySource();
  assert.ok(source.includes('import Scene from "./Generated";'));
  assert.ok(source.includes('id="Beat"'));
  assert.ok(source.includes("durationInFrames: props.durationInFrames"));
  assert.ok(source.includes("registerRoot(Root);"));
});
