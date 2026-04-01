import test from "node:test";
import assert from "node:assert";

import { resolveAddBgmFilterConfig, resolveAddBgmMixParams } from "../../src/agents/add_bgm_agent.js";
import type { MulmoStudioContext } from "../../src/types/index.js";

type AudioParams = MulmoStudioContext["presentationStyle"]["audioParams"];

test("resolveAddBgmMixParams: legacy mode keeps voice volume unchanged", () => {
  const { useExplicitMix, voiceVolume } = resolveAddBgmMixParams({
    audioVolume: 1.2,
  } as AudioParams);
  assert.strictEqual(useExplicitMix, false);
  assert.strictEqual(voiceVolume, 1.2);
});

test("resolveAddBgmMixParams: explicit mode applies ttsVolume to voice only", () => {
  const { useExplicitMix, voiceVolume } = resolveAddBgmMixParams({
    audioVolume: 0.8,
    ttsVolume: 0.5,
  } as AudioParams);
  assert.strictEqual(useExplicitMix, true);
  assert.strictEqual(voiceVolume, 0.4);
});

test("resolveAddBgmFilterConfig: legacy mode has no limiter", () => {
  const config = resolveAddBgmFilterConfig(false);
  assert.strictEqual(config.amixNormalize, "");
  assert.strictEqual(config.mixedOutputId, "mixed");
  assert.strictEqual(config.limiterFilter, undefined);
});

test("resolveAddBgmFilterConfig: explicit mode enables normalize=0 and limiter", () => {
  const config = resolveAddBgmFilterConfig(true);
  assert.strictEqual(config.amixNormalize, ":normalize=0");
  assert.strictEqual(config.mixedOutputId, "mixed_limited");
  assert.ok(config.limiterFilter?.includes("alimiter"), "explicit mode should include limiter");
});
