import { readFileSync, existsSync } from "fs";
import path from "path";
import { type ZodSafeParseResult } from "zod";
import { mulmoScriptSchema } from "../types/schema.js";
import { getScriptFromPromptTemplate } from "../utils/file.js";
import { currentMulmoScriptVersion } from "../types/const.js";
import { promptTemplates } from "../data/index.js";
import type { MulmoScript } from "../types/type.js";
import { loadMulmoConfig } from "../utils/mulmo_config.js";

export type PartialMulmoScript = Record<string, unknown>;

/**
 * Add $mulmocast version if not present
 */
export const addMulmocastVersion = (data: PartialMulmoScript): PartialMulmoScript => {
  if (data.$mulmocast) {
    return data;
  }
  return {
    ...data,
    $mulmocast: { version: currentMulmoScriptVersion },
  };
};

const deepMergeKeys = ["speechParams", "imageParams", "movieParams", "audioParams", "slideParams"] as const;

/**
 * Merge base with override (override takes precedence)
 */
export const mergeScripts = (base: PartialMulmoScript, override: PartialMulmoScript): PartialMulmoScript => {
  const merged: PartialMulmoScript = { ...base, ...override };

  deepMergeKeys.forEach((key) => {
    if (base[key] && override[key]) {
      merged[key] = { ...(base[key] as object), ...(override[key] as object) };
    }
  });

  return merged;
};

/**
 * Check if style specifier is a file path
 */
const isFilePath = (style: string): boolean => {
  return style.endsWith(".json") || style.includes("/") || style.includes("\\");
};

/**
 * Get style by name from promptTemplates
 */
const getStyleByName = (styleName: string): PartialMulmoScript | undefined => {
  const template = promptTemplates.find((t) => t.filename === styleName);
  return template?.presentationStyle as PartialMulmoScript | undefined;
};

/**
 * Get style from file path
 */
const getStyleFromFile = (filePath: string): PartialMulmoScript | undefined => {
  const resolvedPath = path.resolve(filePath);
  if (!existsSync(resolvedPath)) {
    return undefined;
  }
  const content = readFileSync(resolvedPath, "utf-8");
  return JSON.parse(content) as PartialMulmoScript;
};

/**
 * Get style by name or file path
 */
export const getStyle = (style: string): PartialMulmoScript | undefined => {
  return isFilePath(style) ? getStyleFromFile(style) : getStyleByName(style);
};

export type CompleteScriptResult = ZodSafeParseResult<MulmoScript>;

type CompleteScriptOptions = {
  templateName?: string;
  styleName?: string;
  baseDirPath?: string;
};

/**
 * Complete a partial MulmoScript with schema defaults, optional style or template
 *
 * @param data - Partial MulmoScript to complete (highest precedence)
 * @param options - Optional template or style to use as base
 * @param options.templateName - Template name (e.g., "children_book"). Mutually exclusive with styleName.
 * @param options.styleName - Style name or file path. Mutually exclusive with templateName.
 * @returns Zod safe parse result with completed MulmoScript or validation errors
 * @throws Error if both templateName and styleName are specified
 *
 * @example
 * // With template
 * completeScript(data, { templateName: "children_book" })
 *
 * @example
 * // With style
 * completeScript(data, { styleName: "ghibli_comic" })
 *
 * @example
 * // With style from file
 * completeScript(data, { styleName: "./my-style.json" })
 */
export const completeScript = (data: PartialMulmoScript, options: CompleteScriptOptions = {}): CompleteScriptResult => {
  const { templateName, styleName, baseDirPath } = options;

  // template and style are mutually exclusive
  if (templateName && styleName) {
    throw new Error("Cannot specify both templateName and styleName. They are mutually exclusive.");
  }

  // Load mulmo.config.json (lowest priority base)
  const config = baseDirPath ? loadMulmoConfig(baseDirPath) : null;

  // Get base config from template or style
  const getBase = () => {
    if (templateName) {
      return getScriptFromPromptTemplate(templateName);
    }
    if (styleName) {
      return getStyle(styleName);
    }
    return undefined;
  };
  const templateOrStyle = getBase();

  // Merge chain: config < template/style < input data
  const withConfig = config && templateOrStyle ? mergeScripts(config, templateOrStyle) : (templateOrStyle ?? config);
  const merged = withConfig ? mergeScripts(withConfig, data) : data;

  // Add version if not present
  const withVersion = addMulmocastVersion(merged);

  return mulmoScriptSchema.safeParse(withVersion);
};

/**
 * Check if template exists
 */
export const templateExists = (templateName: string): boolean => {
  return getScriptFromPromptTemplate(templateName) !== undefined;
};

/**
 * Check if style exists (by name or file path)
 */
export const styleExists = (style: string): boolean => {
  return getStyle(style) !== undefined;
};
