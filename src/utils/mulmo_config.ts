import { existsSync, readFileSync } from "fs";
import path from "path";
import os from "os";
import { GraphAILogger } from "graphai";
import { mergeScripts, type PartialMulmoScript } from "../tools/complete_script.js";
import { getFullPath } from "./file.js";

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

/**
 * Resolve kind:"path" entries in config to absolute paths relative to config file location.
 */
const resolveMediaSourcePath = (source: Record<string, unknown>, configDirPath: string): Record<string, unknown> => {
  if (source.kind === "path" && typeof source.path === "string") {
    return { ...source, path: getFullPath(configDirPath, source.path) };
  }
  return source;
};

/**
 * Immutably resolve a nested kind:"path" source at the given key path.
 * e.g. ["audioParams", "bgm"] resolves config.audioParams.bgm
 */
const resolveNestedPath = (obj: Record<string, unknown>, keys: string[], configDirPath: string): Record<string, unknown> => {
  const [head, ...tail] = keys;
  const child = obj[head];
  if (!child || typeof child !== "object") {
    return obj;
  }
  const childObj = child as Record<string, unknown>;
  const resolved = tail.length === 0 ? resolveMediaSourcePath(childObj, configDirPath) : resolveNestedPath(childObj, tail, configDirPath);
  return resolved === child ? obj : { ...obj, [head]: resolved };
};

/** Key paths to kind:"path" sources that need resolution */
const MEDIA_SOURCE_PATHS: string[][] = [
  ["audioParams", "bgm"],
  ["slideParams", "branding", "logo", "source"],
  ["slideParams", "branding", "backgroundImage", "source"],
];

/**
 * Resolve all kind:"path" references in config relative to the config file directory.
 */
export const resolveConfigPaths = (config: PartialMulmoScript, configDirPath: string): PartialMulmoScript => {
  return MEDIA_SOURCE_PATHS.reduce<PartialMulmoScript>(
    (acc, keys) => resolveNestedPath(acc as Record<string, unknown>, keys, configDirPath) as PartialMulmoScript,
    config,
  );
};

export type MulmoConfigResult = {
  defaults: PartialMulmoScript;
  override: PartialMulmoScript | null;
};

/**
 * Load mulmo.config.json from baseDirPath or home directory.
 * Resolves kind:"path" entries relative to the config file location.
 * Returns { defaults, override } or null if no config file is found.
 *
 * - defaults: applied as low-priority base (script wins)
 * - override: applied after script merge (wins over script)
 */
export const loadMulmoConfig = (baseDirPath: string): MulmoConfigResult | null => {
  const configPath = findConfigFile(baseDirPath);
  if (!configPath) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const raw = JSON.parse(content) as PartialMulmoScript;
    const configDirPath = path.dirname(configPath);

    const { override: rawOverride, ...rest } = raw;
    const defaults = resolveConfigPaths(rest, configDirPath);
    const override = rawOverride ? resolveConfigPaths(rawOverride as PartialMulmoScript, configDirPath) : null;

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
