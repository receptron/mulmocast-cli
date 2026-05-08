import validateSchemaAgent from "../../src/agents/validate_schema_agent.js";
import test from "node:test";
import assert from "node:assert";
import type { GraphAI } from "graphai";
import { mulmoScriptSchema } from "../../src/types/schema.js";

const validMulmoScriptJson = JSON.stringify({
  $mulmocast: {
    version: "1.1",
    credit: "closing",
  },
  title: "Test Script",
  description: "MulmoScript for testing",
  references: [],
  lang: "ja",
  beats: [
    {
      speaker: "speaker1",
      text: "Hello, this is a test",
      image: {
        type: "image",
        source: {
          kind: "url",
          url: "https://example.com/test-image.jpg",
        },
      },
      imageParams: {
        model: "gpt-image-1",
      },
      speechOptions: {
        speed: 1.0,
        instruction: "Speak clearly",
      },
      imagePrompt: "A test image showing something interesting",
    },
  ],
  speechParams: {
    speakers: {
      speaker1: {
        displayName: {
          ja: "スピーカー 1",
          en: "Speaker 1",
        },
        voiceId: "voice-123",
        speechOptions: {
          speed: 1.0,
          instruction: "Speak naturally",
        },
      },
    },
  },
  imageParams: {
    model: "gpt-image-1",
    provider: "openai",
    style: "natural",
  },
  imagePath: "images/",
});

const invalidMulmoScriptJson = JSON.stringify({
  description: "Incomplete MulmoScript for testing",
  lang: "ja",
  beats: [],
});

const baseParams = {
  params: {},
  debugInfo: {
    verbose: false,
    nodeId: "",
    state: "",
    retry: 0,
    subGraphs: new Map<string, GraphAI>(),
  },
  filterParams: {},
};

test("validateSchemaAgent with valid MulmoScript", async () => {
  const result = await validateSchemaAgent.agent({
    ...baseParams,
    namedInputs: { text: validMulmoScriptJson, schema: mulmoScriptSchema },
  });
  assert(result);
  assert(result.isValid === true);
  assert(result.data !== null);
});

test("validateSchemaAgent with invalid MulmoScript", async () => {
  const result = await validateSchemaAgent.agent({
    ...baseParams,
    namedInputs: { text: invalidMulmoScriptJson, schema: mulmoScriptSchema },
  });

  assert(result);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error);
});
