import { describe, test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import os from "os";

import { findConfigFile, loadMulmoConfig, resolveConfigPaths, mergeConfigWithScript } from "../../src/utils/mulmo_config.js";
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
});

describe("resolveConfigPaths", () => {
  test("resolves audioParams.bgm kind:path", () => {
    const configDir = "/home/user/project";
    const config = {
      audioParams: {
        bgm: { kind: "path", path: "assets/bgm.mp3" },
        bgmVolume: 0.15,
      },
    };
    const resolved = resolveConfigPaths(config, configDir);
    const audioParams = resolved.audioParams as Record<string, unknown>;
    const bgm = audioParams.bgm as Record<string, unknown>;
    assert.strictEqual(bgm.path, path.resolve(configDir, "assets/bgm.mp3"));
    assert.strictEqual(bgm.kind, "path");
    // bgmVolume should be preserved
    assert.strictEqual(audioParams.bgmVolume, 0.15);
  });

  test("does not modify audioParams.bgm kind:url", () => {
    const config = {
      audioParams: {
        bgm: { kind: "url", url: "https://example.com/bgm.mp3" },
      },
    };
    const resolved = resolveConfigPaths(config, "/some/dir");
    const audioParams = resolved.audioParams as Record<string, unknown>;
    const bgm = audioParams.bgm as Record<string, unknown>;
    assert.strictEqual(bgm.kind, "url");
    assert.strictEqual(bgm.url, "https://example.com/bgm.mp3");
  });

  test("resolves slideParams.branding.logo.source kind:path", () => {
    const configDir = "/home/user/project";
    const config = {
      slideParams: {
        branding: {
          logo: {
            source: { kind: "path", path: "brand/logo.svg" },
            position: "top-right",
          },
        },
      },
    };
    const resolved = resolveConfigPaths(config, configDir);
    const slideParams = resolved.slideParams as Record<string, unknown>;
    const branding = slideParams.branding as Record<string, unknown>;
    const logo = branding.logo as Record<string, unknown>;
    const source = logo.source as Record<string, unknown>;
    assert.strictEqual(source.path, path.resolve(configDir, "brand/logo.svg"));
    assert.strictEqual(logo.position, "top-right");
  });

  test("resolves slideParams.branding.backgroundImage.source kind:path", () => {
    const configDir = "/home/user/project";
    const config = {
      slideParams: {
        branding: {
          backgroundImage: {
            source: { kind: "path", path: "brand/bg.png" },
          },
        },
      },
    };
    const resolved = resolveConfigPaths(config, configDir);
    const slideParams = resolved.slideParams as Record<string, unknown>;
    const branding = slideParams.branding as Record<string, unknown>;
    const bgImage = branding.backgroundImage as Record<string, unknown>;
    const source = bgImage.source as Record<string, unknown>;
    assert.strictEqual(source.path, path.resolve(configDir, "brand/bg.png"));
  });

  test("does not modify already-absolute paths", () => {
    const config = {
      audioParams: {
        bgm: { kind: "path", path: "/absolute/path/bgm.mp3" },
      },
    };
    const resolved = resolveConfigPaths(config, "/some/dir");
    const audioParams = resolved.audioParams as Record<string, unknown>;
    const bgm = audioParams.bgm as Record<string, unknown>;
    assert.strictEqual(bgm.path, path.normalize("/absolute/path/bgm.mp3"));
  });

  test("handles config with no path fields", () => {
    const config = {
      imageParams: { provider: "google" },
      speechParams: { speakers: {} },
    };
    const resolved = resolveConfigPaths(config, "/some/dir");
    assert.deepStrictEqual(resolved, config);
  });
});

// ---------------------------------------------------------------------------
// resolveConfigPaths — resolveNestedPath recursive resolution tests
//
// resolveNestedPath is a private recursive function that walks a key path
// (e.g. ["slideParams", "branding", "logo", "source"]) and resolves
// kind:"path" entries at the leaf. These tests exercise it through
// the public resolveConfigPaths API.
// ---------------------------------------------------------------------------
describe("resolveConfigPaths - resolveNestedPath recursive behavior", () => {
  // --- Happy path: all three MEDIA_SOURCE_PATHS resolved in a single config ---
  test("resolves all three media source paths simultaneously", () => {
    const configDir = "/project";
    const config = {
      audioParams: {
        bgm: { kind: "path", path: "music/bgm.mp3" },
      },
      slideParams: {
        branding: {
          logo: {
            source: { kind: "path", path: "img/logo.png" },
          },
          backgroundImage: {
            source: { kind: "path", path: "img/bg.jpg" },
          },
        },
      },
    };
    const resolved = resolveConfigPaths(config, configDir);

    // All three paths should be resolved to absolute
    const bgm = (resolved.audioParams as Record<string, unknown>).bgm as Record<string, unknown>;
    assert.strictEqual(bgm.path, path.resolve(configDir, "music/bgm.mp3"));

    const branding = (resolved.slideParams as Record<string, unknown>).branding as Record<string, unknown>;
    const logoSource = (branding.logo as Record<string, unknown>).source as Record<string, unknown>;
    assert.strictEqual(logoSource.path, path.resolve(configDir, "img/logo.png"));

    const bgSource = (branding.backgroundImage as Record<string, unknown>).source as Record<string, unknown>;
    assert.strictEqual(bgSource.path, path.resolve(configDir, "img/bg.jpg"));
  });

  // --- No-op: intermediate key is missing (recursion stops early) ---
  test("returns config unchanged when intermediate key does not exist", () => {
    const config = {
      imageParams: { provider: "google" },
      // audioParams is missing entirely → bgm path should be skipped
      // slideParams is missing entirely → branding paths should be skipped
    };
    const resolved = resolveConfigPaths(config, "/some/dir");
    // Should be identical — no paths to resolve
    assert.deepStrictEqual(resolved, config);
  });

  // --- No-op: intermediate key is a non-object value (e.g. string) ---
  test("returns config unchanged when intermediate key is not an object", () => {
    const config = {
      audioParams: "not-an-object", // bgm traversal should stop here
    };
    const resolved = resolveConfigPaths(config as Record<string, unknown>, "/dir");
    assert.deepStrictEqual(resolved, config);
  });

  // --- No-op: intermediate key is null ---
  test("returns config unchanged when intermediate key is null", () => {
    const config = {
      slideParams: null, // branding traversal should stop here
    };
    const resolved = resolveConfigPaths(config as Record<string, unknown>, "/dir");
    assert.deepStrictEqual(resolved, config);
  });

  // --- No-op: leaf is kind:"url" (resolveMediaSourcePath returns original) ---
  test("does not modify leaf when kind is not 'path'", () => {
    const config = {
      slideParams: {
        branding: {
          logo: {
            source: { kind: "url", url: "https://example.com/logo.svg" },
          },
        },
      },
    };
    const resolved = resolveConfigPaths(config, "/dir");
    const source = (((resolved.slideParams as Record<string, unknown>).branding as Record<string, unknown>).logo as Record<string, unknown>).source as Record<
      string,
      unknown
    >;
    assert.strictEqual(source.kind, "url");
    assert.strictEqual(source.url, "https://example.com/logo.svg");
  });

  // --- Sibling preservation: properties next to the resolved path are kept ---
  test("preserves sibling properties at every nesting level", () => {
    const configDir = "/project";
    const config = {
      audioParams: {
        bgm: { kind: "path", path: "bgm.mp3" },
        bgmVolume: 0.2, // sibling of bgm
        fadeIn: true, // sibling of bgm
      },
      slideParams: {
        theme: "corporate", // sibling of branding
        branding: {
          companyName: "Acme", // sibling of logo
          logo: {
            source: { kind: "path", path: "logo.svg" },
            position: "top-left", // sibling of source
            size: 48, // sibling of source
          },
        },
      },
      imageParams: { provider: "google" }, // unrelated top-level key
    };
    const resolved = resolveConfigPaths(config, configDir);

    // audioParams siblings preserved
    const audioParams = resolved.audioParams as Record<string, unknown>;
    assert.strictEqual(audioParams.bgmVolume, 0.2);
    assert.strictEqual(audioParams.fadeIn, true);

    // slideParams siblings preserved
    const slideParams = resolved.slideParams as Record<string, unknown>;
    assert.strictEqual(slideParams.theme, "corporate");

    // branding siblings preserved
    const branding = slideParams.branding as Record<string, unknown>;
    assert.strictEqual(branding.companyName, "Acme");

    // logo siblings preserved
    const logo = branding.logo as Record<string, unknown>;
    assert.strictEqual(logo.position, "top-left");
    assert.strictEqual(logo.size, 48);

    // unrelated top-level key preserved
    assert.deepStrictEqual(resolved.imageParams, { provider: "google" });
  });

  // --- Immutability: original config object is not mutated ---
  test("does not mutate the original config object", () => {
    const configDir = "/project";
    const originalSource = { kind: "path", path: "bgm.mp3" };
    const originalBgm = { ...originalSource };
    const config = {
      audioParams: {
        bgm: originalSource,
      },
    };

    resolveConfigPaths(config, configDir);

    // Original source object should remain unchanged
    assert.strictEqual(originalSource.path, "bgm.mp3");
    assert.deepStrictEqual(originalSource, originalBgm);
  });

  // --- Shared prefix: two paths under slideParams.branding are both resolved ---
  test("resolves both logo and backgroundImage under shared branding prefix", () => {
    const configDir = "/brand";
    const config = {
      slideParams: {
        branding: {
          logo: {
            source: { kind: "path", path: "assets/logo.svg" },
          },
          backgroundImage: {
            source: { kind: "path", path: "assets/bg.png" },
          },
        },
      },
    };
    const resolved = resolveConfigPaths(config, configDir);
    const branding = (resolved.slideParams as Record<string, unknown>).branding as Record<string, unknown>;

    const logoPath = ((branding.logo as Record<string, unknown>).source as Record<string, unknown>).path;
    const bgPath = ((branding.backgroundImage as Record<string, unknown>).source as Record<string, unknown>).path;

    assert.strictEqual(logoPath, path.resolve(configDir, "assets/logo.svg"));
    assert.strictEqual(bgPath, path.resolve(configDir, "assets/bg.png"));
  });

  // --- Empty config: no keys at all ---
  test("handles empty config without error", () => {
    const resolved = resolveConfigPaths({}, "/dir");
    assert.deepStrictEqual(resolved, {});
  });

  // --- Deep path with only partial nesting (branding exists but logo does not) ---
  test("stops gracefully when deep path is partially present", () => {
    const config = {
      slideParams: {
        branding: {
          // logo is missing, backgroundImage is missing
          companyName: "Test",
        },
      },
    };
    const resolved = resolveConfigPaths(config, "/dir");
    const branding = (resolved.slideParams as Record<string, unknown>).branding as Record<string, unknown>;
    assert.strictEqual(branding.companyName, "Test");
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

  test("override path resolution works", () => {
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
      assert.strictEqual(bgm.path, path.resolve(tmpDir, "brand/bgm.mp3"));
    } finally {
      cleanup(tmpDir);
    }
  });
});
