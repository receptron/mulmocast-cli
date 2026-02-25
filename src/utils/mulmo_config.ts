import { existsSync, readFileSync } from "fs";
import path from "path";
import os from "os";
import { GraphAILogger } from "graphai";
import { mergeScripts, type PartialMulmoScript } from "../tools/complete_script.js";

const CONFIG_FILE_NAME = "mulmo.config.json";

/**
 * Search for mulmo.config.json in CWD → ~ order.
 * Returns the first found path, or null if not found.
 */
export const findConfigFile = (baseDirPath: string): string | null => {
  const candidates = [path.resolve(baseDirPath, CONFIG_FILE_NAME), path.resolve(os.homedir(), CONFIG_FILE_NAME)];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

export type MulmoConfigResult = {
  defaults: PartialMulmoScript;
  override: PartialMulmoScript | null;
};

/**
 * Load mulmo.config.json from baseDirPath or home directory.
 * Returns { defaults, override } or null if no config file is found.
 *
 * - defaults: applied as low-priority base (script wins)
 * - override: applied after script merge (wins over script)
 *
 * Note: kind:"path" entries are NOT resolved here.
 * They remain as relative paths and are resolved at runtime
 * relative to the script file directory (mulmoFileDirPath),
 * consistent with all other path resolution in MulmoScript.
 */
export const loadMulmoConfig = (baseDirPath: string): MulmoConfigResult | null => {
  const configPath = findConfigFile(baseDirPath);
  if (!configPath) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const raw = JSON.parse(content) as PartialMulmoScript;

    const { override: rawOverride, ...rest } = raw;
    const defaults = rest;
    const override = rawOverride ? (rawOverride as PartialMulmoScript) : null;

    return { defaults, override };
  } catch (error) {
    GraphAILogger.error(`Error loading ${configPath}: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Merge mulmo.config.json with a MulmoScript.
 * defaults < script < override
 */
export const mergeConfigWithScript = (configResult: MulmoConfigResult, script: PartialMulmoScript): PartialMulmoScript => {
  const withDefaults = mergeScripts(configResult.defaults, script);
  return configResult.override ? mergeScripts(withDefaults, configResult.override) : withDefaults;
};
