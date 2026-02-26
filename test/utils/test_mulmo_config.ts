import { describe, test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import os from "os";

import { findConfigFile, loadMulmoConfig, mergeConfigWithScript } from "../../src/utils/mulmo_config.js";
import { mergeScripts } from "../../src/tools/complete_script.js";

const CONFIG_FILE_NAME = "mulmo.config.json";

// Create a temporary directory for test isolation
const createTempDir = (): string => {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mulmo-config-test-"));
};

const cleanup = (dirPath: string) => {
  fs.rmSync(dirPath, { recursive: true, force: true });
};

const writeConfig = (dirPath: string, content: Record<string, unknown>) => {
  fs.writeFileSync(path.join(dirPath, CONFIG_FILE_NAME), JSON.stringify(content, null, 2), "utf-8");
};

describe("findConfigFile", () => {
  test("returns null when no config file exists", () => {
    const tmpDir = createTempDir();
    try {
      const result = findConfigFile(tmpDir);
      assert.strictEqual(result, null);
    } finally {
      cleanup(tmpDir);
    }
  });

  test("finds config in CWD (baseDirPath)", () => {
    const tmpDir = createTempDir();
    try {
      writeConfig(tmpDir, { imageParams: { provider: "google" } });
      const result = findConfigFile(tmpDir);
      assert.strictEqual(result, path.join(tmpDir, CONFIG_FILE_NAME));
    } finally {
      cleanup(tmpDir);
    }
  });

  test("finds config in home directory when not in CWD", () => {
    const tmpDir = createTempDir();
    const homeConfigPath = path.join(os.homedir(), CONFIG_FILE_NAME);
    const homeConfigExists = fs.existsSync(homeConfigPath);

    // Skip if home config already exists (don't interfere with user's real config)
    if (homeConfigExists) {
      cleanup(tmpDir);
      return;
    }

    try {
      fs.writeFileSync(homeConfigPath, JSON.stringify({ imageParams: { provider: "openai" } }), "utf-8");
      const result = findConfigFile(tmpDir);
      assert.strictEqual(result, homeConfigPath);
    } finally {
      if (!homeConfigExists && fs.existsSync(homeConfigPath)) {
        fs.unlinkSync(homeConfigPath);
      }
      cleanup(tmpDir);
    }
  });

  test("CWD config takes priority over home directory config", () => {
    const tmpDir = createTempDir();
    const homeConfigPath = path.join(os.homedir(), CONFIG_FILE_NAME);
    const homeConfigExists = fs.existsSync(homeConfigPath);

    if (homeConfigExists) {
      // Can still test CWD priority - home config exists already
      writeConfig(tmpDir, { imageParams: { provider: "google" } });
      const result = findConfigFile(tmpDir);
      assert.strictEqual(result, path.join(tmpDir, CONFIG_FILE_NAME));
      cleanup(tmpDir);
      return;
    }

    try {
      fs.writeFileSync(homeConfigPath, JSON.stringify({ imageParams: { provider: "openai" } }), "utf-8");
      writeConfig(tmpDir, { imageParams: { provider: "google" } });
      const result = findConfigFile(tmpDir);
      assert.strictEqual(result, path.join(tmpDir, CONFIG_FILE_NAME));
    } finally {
      if (!homeConfigExists && fs.existsSync(homeConfigPath)) {
        fs.unlinkSync(homeConfigPath);
      }
      cleanup(tmpDir);
    }
  });
});

describe("loadMulmoConfig", () => {
  test("returns null when no config exists", () => {
    const tmpDir = createTempDir();
    try {
      const result = loadMulmoConfig(tmpDir);
      assert.strictEqual(result, null);
    } finally {
      cleanup(tmpDir);
    }
  });

  test("loads valid config without override", () => {
    const tmpDir = createTempDir();
    try {
      const config = { imageParams: { provider: "google" }, speechParams: { speakers: { Presenter: { provider: "gemini" } } } };
      writeConfig(tmpDir, config);
      const result = loadMulmoConfig(tmpDir);
      assert.ok(result);
      assert.deepStrictEqual(result.defaults.imageParams, { provider: "google" });
      assert.deepStrictEqual(result.defaults.speechParams, { speakers: { Presenter: { provider: "gemini" } } });
      assert.strictEqual(result.override, null);
    } finally {
      cleanup(tmpDir);
    }
  });

  test("loads config with override", () => {
    const tmpDir = createTempDir();
    try {
      const config = {
        speechParams: { provider: "elevenlabs" },
        override: {
          speechParams: { provider: "elevenlabs", model: "eleven_multilingual_v2" },
        },
      };
      writeConfig(tmpDir, config);
      const result = loadMulmoConfig(tmpDir);
      assert.ok(result);
      assert.deepStrictEqual(result.defaults.speechParams, { provider: "elevenlabs" });
      assert.strictEqual(result.defaults.override, undefined);
      assert.ok(result.override);
      assert.deepStrictEqual(result.override.speechParams, { provider: "elevenlabs", model: "eleven_multilingual_v2" });
    } finally {
      cleanup(tmpDir);
    }
  });

  test("throws on invalid JSON", () => {
    const tmpDir = createTempDir();
    try {
      fs.writeFileSync(path.join(tmpDir, CONFIG_FILE_NAME), "{ invalid json }", "utf-8");
      assert.throws(() => loadMulmoConfig(tmpDir));
    } finally {
      cleanup(tmpDir);
    }
  });

  test("loads empty config as valid no-op", () => {
    const tmpDir = createTempDir();
    try {
      writeConfig(tmpDir, {});
      const result = loadMulmoConfig(tmpDir);
      assert.ok(result);
      assert.deepStrictEqual(result.defaults, {});
      assert.strictEqual(result.override, null);
    } finally {
      cleanup(tmpDir);
    }
  });

  test("preserves kind:path entries as-is without resolving to absolute", () => {
    const tmpDir = createTempDir();
    try {
      const config = {
        audioParams: {
          bgm: { kind: "path", path: "assets/bgm.mp3" },
        },
        slideParams: {
          branding: {
            logo: {
              source: { kind: "path", path: "brand/logo.svg" },
            },
          },
        },
      };
      writeConfig(tmpDir, config);
      const result = loadMulmoConfig(tmpDir);
      assert.ok(result);
      const audioParams = result.defaults.audioParams as Record<string, unknown>;
      const bgm = audioParams.bgm as Record<string, unknown>;
      assert.strictEqual(bgm.path, "assets/bgm.mp3");

      const slideParams = result.defaults.slideParams as Record<string, unknown>;
      const branding = slideParams.branding as Record<string, unknown>;
      const logo = branding.logo as Record<string, unknown>;
      const source = logo.source as Record<string, unknown>;
      assert.strictEqual(source.path, "brand/logo.svg");
    } finally {
      cleanup(tmpDir);
    }
  });

  test("preserves kind:path in override without resolving", () => {
    const tmpDir = createTempDir();
    try {
      const config = {
        override: {
          audioParams: {
            bgm: { kind: "path", path: "brand/bgm.mp3" },
          },
        },
      };
      writeConfig(tmpDir, config);
      const result = loadMulmoConfig(tmpDir);
      assert.ok(result);
      assert.ok(result.override);
      const audioParams = result.override.audioParams as Record<string, unknown>;
      const bgm = audioParams.bgm as Record<string, unknown>;
      assert.strictEqual(bgm.path, "brand/bgm.mp3");
    } finally {
      cleanup(tmpDir);
    }
  });
});

describe("mergeScripts - config with script", () => {
  test("script values override config", () => {
    const config = {
      imageParams: { provider: "google", model: "imagen-3" },
      speechParams: { speakers: { Presenter: { provider: "gemini" } } },
    };
    const script = {
      imageParams: { provider: "openai" },
    };
    const merged = mergeScripts(config, script);
    // script's imageParams overrides config's (shallow merge within imageParams)
    const imageParams = merged.imageParams as Record<string, unknown>;
    assert.strictEqual(imageParams.provider, "openai");
    assert.strictEqual(imageParams.model, "imagen-3"); // preserved from config
    // speechParams from config preserved
    assert.ok(merged.speechParams);
  });

  test("speechParams shallow merge prefers script speakers", () => {
    const config = {
      speechParams: { speakers: { Presenter: { provider: "gemini" } } },
    };
    const script = {
      speechParams: { speakers: { Host: { provider: "openai" } } },
    };
    const merged = mergeScripts(config, script);
    const speechParams = merged.speechParams as Record<string, unknown>;
    // script wins in shallow merge of speechParams
    assert.deepStrictEqual(speechParams.speakers, { Host: { provider: "openai" } });
  });

  test("slideParams are deep merged", () => {
    const config = {
      slideParams: { theme: "corporate", branding: { logo: { position: "top-right" } } },
    };
    const script = {
      slideParams: { branding: { logo: { position: "top-left" } } },
    };
    const merged = mergeScripts(config, script);
    const slideParams = merged.slideParams as Record<string, unknown>;
    // script's slideParams override at the first level within slideParams
    assert.ok(slideParams.branding);
    // theme from config is preserved
    assert.strictEqual(slideParams.theme, "corporate");
  });

  test("non-overlapping keys are all preserved", () => {
    const config = {
      audioParams: { bgmVolume: 0.15 },
    };
    const script = {
      imageParams: { provider: "google" },
    };
    const merged = mergeScripts(config, script);
    assert.ok(merged.audioParams);
    assert.ok(merged.imageParams);
  });
});

describe("mergeConfigWithScript - override", () => {
  test("without override, script wins over defaults", () => {
    const configResult = {
      defaults: { speechParams: { provider: "gemini" } },
      override: null,
    };
    const script = { speechParams: { provider: "openai" } };
    const merged = mergeConfigWithScript(configResult, script);
    const speechParams = merged.speechParams as Record<string, unknown>;
    assert.strictEqual(speechParams.provider, "openai");
  });

  test("override wins over script", () => {
    const configResult = {
      defaults: {},
      override: { speechParams: { provider: "elevenlabs", model: "eleven_multilingual_v2" } },
    };
    const script = { speechParams: { provider: "openai" } };
    const merged = mergeConfigWithScript(configResult, script);
    const speechParams = merged.speechParams as Record<string, unknown>;
    assert.strictEqual(speechParams.provider, "elevenlabs");
    assert.strictEqual(speechParams.model, "eleven_multilingual_v2");
  });

  test("defaults lose to script, override wins over script", () => {
    const configResult = {
      defaults: { imageParams: { provider: "google" }, speechParams: { provider: "gemini" } },
      override: { speechParams: { provider: "elevenlabs" } },
    };
    const script = {
      imageParams: { provider: "openai" },
      speechParams: { provider: "openai", model: "tts-1" },
    };
    const merged = mergeConfigWithScript(configResult, script);
    const imageParams = merged.imageParams as Record<string, unknown>;
    const speechParams = merged.speechParams as Record<string, unknown>;
    // imageParams: script wins over defaults (no override for imageParams)
    assert.strictEqual(imageParams.provider, "openai");
    // speechParams: override wins over script
    assert.strictEqual(speechParams.provider, "elevenlabs");
    // model from script is preserved (override does shallow merge within speechParams)
    assert.strictEqual(speechParams.model, "tts-1");
  });
});
