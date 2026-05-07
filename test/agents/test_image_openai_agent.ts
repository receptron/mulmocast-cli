import test from "node:test";
import assert from "node:assert";
import { buildDeprecatedModelMessage } from "../../src/agents/image_openai_agent.js";

test("buildDeprecatedModelMessage returns migration hint for dall-e-2", () => {
  const message = buildDeprecatedModelMessage("dall-e-2");
  assert.ok(message);
  assert.match(message, /dall-e-2.*no longer available/);
  assert.match(message, /gpt-image-1/);
});

test("buildDeprecatedModelMessage returns migration hint for dall-e-3", () => {
  const message = buildDeprecatedModelMessage("dall-e-3");
  assert.ok(message);
  assert.match(message, /dall-e-3.*no longer available/);
  assert.match(message, /gpt-image-1/);
});

test("buildDeprecatedModelMessage returns null for currently supported model", () => {
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-1"), null);
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-1-mini"), null);
});

test("buildDeprecatedModelMessage returns null for unknown / future model names", () => {
  assert.strictEqual(buildDeprecatedModelMessage("gpt-image-99"), null);
  assert.strictEqual(buildDeprecatedModelMessage("typo-model"), null);
  assert.strictEqual(buildDeprecatedModelMessage(""), null);
});
