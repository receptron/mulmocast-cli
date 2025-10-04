import test from "node:test";
import assert from "node:assert";

import { getExtention } from "../../src/methods/mulmo_media_source.js"
import { settings2GraphAIConfig, deepClean } from "../../src/utils/utils.js";

test("test getExtention", async () => {
  const ext = getExtention("image/jpeg", "http://example.com/a.png");
  assert.equal(ext, "jpg");
});

test("test getExtention", async () => {
  const ext = getExtention("image/jpg", "http://example.com/a.png");
  assert.equal(ext, "jpg");
});

test("test getExtention", async () => {
  const ext = getExtention("image/png", "http://example.com/a.png");
  assert.equal(ext, "png");
});

test("test getExtention", async () => {
  const ext = getExtention("text/md", "http://example.com/a.jpg");
  assert.equal(ext, "jpg");
});

test("test getExtention", async () => {
  const ext = getExtention("text/md", "http://example.com/a.gif");
  assert.equal(ext, "png");
});

test("test settings2GraphAIConfig", async () => {
  const res1 = settings2GraphAIConfig(
    {
      LLM_OPENAI_API_KEY: "llm_setting",
      OPENAI_API_KEY: "openai_setting",
    },
    {
      LLM_OPENAI_API_KEY: "llm_env",
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res1, {
    openAIAgent: { apiKey: "llm_setting" },
    ttsOpenaiAgent: { apiKey: "openai_setting" },
    imageOpenaiAgent: { apiKey: "openai_setting" },
  });

  const res2 = settings2GraphAIConfig(
    {
      OPENAI_API_KEY: "openai_setting",
    },
    {
      LLM_OPENAI_API_KEY: "llm_env",
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res2, {
    openAIAgent: { apiKey: "openai_setting" },
    ttsOpenaiAgent: { apiKey: "openai_setting" },
    imageOpenaiAgent: { apiKey: "openai_setting" },
  });

  const res3 = settings2GraphAIConfig(
    {},
    {
      LLM_OPENAI_API_KEY: "llm_env",
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res3, {
    openAIAgent: { apiKey: "llm_env" },
    ttsOpenaiAgent: { apiKey: "openai_env" },
    imageOpenaiAgent: { apiKey: "openai_env" },
  });

  const res4 = settings2GraphAIConfig(
    {},
    {
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res4, {
    openAIAgent: { apiKey: "openai_env" },
    ttsOpenaiAgent: { apiKey: "openai_env" },
    imageOpenaiAgent: { apiKey: "openai_env" },
  });

  const res5 = settings2GraphAIConfig(
    {
      LLM_OPENAI_API_KEY: "llm_setting",
    },
    {
      LLM_OPENAI_API_KEY: "llm_env",
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res5, {
    openAIAgent: { apiKey: "llm_setting" },
    ttsOpenaiAgent: { apiKey: "openai_env" },
    imageOpenaiAgent: { apiKey: "openai_env" },
  });

  const res6 = settings2GraphAIConfig(
    {
      LLM_OPENAI_API_KEY: "llm_setting",
    },
    {
      LLM_OPENAI_API_KEY: "llm_env",
    },
  );
  assert.deepStrictEqual(res6, {
    openAIAgent: { apiKey: "llm_setting" },
  });

  const res7 = settings2GraphAIConfig(
    {
      LLM_OPENAI_API_KEY: "llm_setting",
    },
    {
      TTS_OPENAI_API_KEY: "tts_env",
      OPENAI_API_KEY: "openai_env",
    },
  );
  assert.deepStrictEqual(res7, {
    openAIAgent: { apiKey: "llm_setting" },
    ttsOpenaiAgent: { apiKey: "tts_env" },
    imageOpenaiAgent: { apiKey: "openai_env" },
  });

  const res8 = settings2GraphAIConfig({}, {});
  assert.deepStrictEqual(res8, {});
});

test("test settings2GraphAIConfig", async () => {
  const agents = {
    openAIAgent: { apiKey: "aaa", baseURL: "" },
    ttsOpenaiAgent: { apiKey: "123", baseURL: undefined },
    imageOpenaiAgent: { apiKey: "aaa", baseURL: null },
    anthropicAgent: { apiKey: undefined },
    movieReplicateAgent: { apiKey: null },
    emptyAgent: { apiKey: "" },
    nestedAgent: {
      foo: {
        bar: null,
        baz: "",
        keep: "yes",
      },
      drop: undefined,
    },
  };

  const res = deepClean(agents);
  assert.deepStrictEqual(res, {
    openAIAgent: { apiKey: "aaa" },
    ttsOpenaiAgent: { apiKey: "123" },
    imageOpenaiAgent: { apiKey: "aaa" },
    nestedAgent: {
      foo: {
        keep: "yes",
      },
    },
  });
});
