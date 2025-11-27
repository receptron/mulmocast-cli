import { describe, test } from "node:test";
import assert from "node:assert";

import { getExtention } from "../../src/methods/mulmo_media_source.js";
import { settings2GraphAIConfig, deepClean, getAspectRatio } from "../../src/utils/utils.js";

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

const ASPECT_RATIOS = ["1:1", "9:16", "16:9"];
const PRO_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

test("test getAspectRatio", async () => {
  const result = getAspectRatio({ width: 1280, height: 720 }, ASPECT_RATIOS);
  assert.equal(result, "16:9");
});

describe("getAspectRatio - standard ratios", () => {
  test("16:9 input → 16:9", () => {
    const result = getAspectRatio({ width: 1920, height: 1080 }, ASPECT_RATIOS);
    assert.equal(result, "16:9");
  });

  test("9:16 input → 9:16", () => {
    const result = getAspectRatio({ width: 1080, height: 1920 }, ASPECT_RATIOS);
    assert.equal(result, "9:16");
  });

  test("1:1 input → 1:1", () => {
    const result = getAspectRatio({ width: 1000, height: 1000 }, ASPECT_RATIOS);
    assert.equal(result, "1:1");
  });

  test("borderline 1:1 but slightly wider → 1:1", () => {
    const result = getAspectRatio({ width: 1010, height: 1000 }, ASPECT_RATIOS);
    assert.equal(result, "1:1");
  });

  test("borderline 1:1 but slightly taller → 1:1", () => {
    const result = getAspectRatio({ width: 1000, height: 1010 }, ASPECT_RATIOS);
    assert.equal(result, "1:1");
  });

  test("weird ratio (1.4) but nearest is 16:9", () => {
    const result = getAspectRatio({ width: 1400, height: 1000 }, ASPECT_RATIOS);
    assert.equal(result, "16:9");
  });
});

// ======= PRO アスペクト比の網羅テスト =======
describe("getAspectRatio - PRO_ASPECT_RATIOS", () => {
  const cases = [
    // 完全一致パターン
    { size: { w: 1000, h: 1000 }, expected: "1:1" },
    { size: { w: 2000, h: 3000 }, expected: "2:3" },
    { size: { w: 3000, h: 2000 }, expected: "3:2" },
    { size: { w: 3000, h: 4000 }, expected: "3:4" },
    { size: { w: 4000, h: 3000 }, expected: "4:3" },
    { size: { w: 4000, h: 5000 }, expected: "4:5" },
    { size: { w: 5000, h: 4000 }, expected: "5:4" },
    { size: { w: 900, h: 1600 }, expected: "9:16" },
    { size: { w: 1600, h: 900 }, expected: "16:9" },
    { size: { w: 2100, h: 900 }, expected: "21:9" },

    // 境界値（少しズレても近い方に丸める）
    { size: { w: 2101, h: 900 }, expected: "21:9" },
    { size: { w: 1601, h: 900 }, expected: "16:9" },

    { size: { w: 1400, h: 1000 }, expected: "4:3" },

    { size: { w: 1100, h: 1600 }, expected: "2:3" },
    { size: { w: 1400, h: 2100 }, expected: "2:3" },
  ];

  for (const c of cases) {
    test(`size ${c.size.w}x${c.size.h} → ${c.expected}`, () => {
      const result = getAspectRatio({ width: c.size.w, height: c.size.h }, PRO_ASPECT_RATIOS);
      assert.equal(result, c.expected);
    });
  }
});

// ======= edge cases =======
describe("getAspectRatio - edge cases", () => {
  test("very small numbers", () => {
    const result = getAspectRatio({ width: 1, height: 2 }, PRO_ASPECT_RATIOS);
    assert.equal(result, "9:16");
  });

  test("very large numbers (ratio only matters)", () => {
    const result = getAspectRatio({ width: 10000, height: 5000 }, PRO_ASPECT_RATIOS);
    assert.equal(result, "16:9");
  });

  test("floating inputs", () => {
    const result = getAspectRatio({ width: 1920.5, height: 1080.2 }, PRO_ASPECT_RATIOS);
    assert.equal(result, "16:9");
  });

  test("identical ratio but weird decimal", () => {
    const result = getAspectRatio({ width: 1.777, height: 1 }, PRO_ASPECT_RATIOS);
    assert.equal(result, "16:9");
  });
});
