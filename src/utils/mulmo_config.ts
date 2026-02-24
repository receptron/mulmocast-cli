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

/**
 * Resolve kind:"path" entries in config to absolute paths relative to config file location.
 */
const resolveMediaSourcePath = (source: Record<string, unknown>, configDirPath: string): Record<string, unknown> => {
  if (source.kind === "path" && typeof source.path === "string" && !path.isAbsolute(source.path)) {
    return { ...source, path: path.resolve(configDirPath, source.path) };
  }
  return source;
};

/**
 * Resolve all kind:"path" references in config relative to the config file directory.
 *
 * Targets:
 * - audioParams.bgm
 * - slideParams.branding.logo.source
 * - slideParams.branding.backgroundImage.source
 */
export const resolveConfigPaths = (config: PartialMulmoScript, configDirPath: string): PartialMulmoScript => {
  const resolved = { ...config };

  // audioParams.bgm
  const audioParams = resolved.audioParams as Record<string, unknown> | undefined;
  if (audioParams?.bgm && typeof audioParams.bgm === "object") {
    resolved.audioParams = {
      ...audioParams,
      bgm: resolveMediaSourcePath(audioParams.bgm as Record<string, unknown>, configDirPath),
    };
  }

  // slideParams.branding.logo.source and slideParams.branding.backgroundImage.source
  const slideParams = resolved.slideParams as Record<string, unknown> | undefined;
  if (slideParams?.branding && typeof slideParams.branding === "object") {
    const branding = { ...(slideParams.branding as Record<string, unknown>) };

    const logoObj = branding.logo as Record<string, unknown> | undefined;
    if (logoObj?.source && typeof logoObj.source === "object") {
      branding.logo = {
        ...logoObj,
        source: resolveMediaSourcePath(logoObj.source as Record<string, unknown>, configDirPath),
      };
    }

    const bgImageObj = branding.backgroundImage as Record<string, unknown> | undefined;
    if (bgImageObj?.source && typeof bgImageObj.source === "object") {
      branding.backgroundImage = {
        ...bgImageObj,
        source: resolveMediaSourcePath(bgImageObj.source as Record<string, unknown>, configDirPath),
      };
    }

    resolved.slideParams = { ...slideParams, branding };
  }

  return resolved;
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
