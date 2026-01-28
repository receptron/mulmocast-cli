import { readFileSync, existsSync } from "fs";
import path from "path";
import { type ZodSafeParseResult } from "zod";
import { mulmoScriptSchema } from "../types/schema.js";
import { getScriptFromPromptTemplate } from "../utils/file.js";
import { currentMulmoScriptVersion } from "../types/const.js";
import { promptTemplates } from "../data/index.js";
import type { MulmoScript } from "../types/type.js";

type PartialMulmoScript = Record<string, unknown>;

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

const deepMergeKeys = ["speechParams", "imageParams", "movieParams", "audioParams"] as const;

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
};

/**
 * Complete a partial MulmoScript with schema defaults, optional style and template
 * Precedence: style (lowest) -> template -> input data (highest)
 */
export const completeScript = (data: PartialMulmoScript, options: CompleteScriptOptions = {}): CompleteScriptResult => {
  const { templateName, styleName } = options;

  // Start with style as base (lowest precedence)
  const style = styleName ? getStyle(styleName) : undefined;
  const withStyle = style ? mergeScripts(style, data) : data;

  // Apply template (middle precedence)
  const template = templateName ? getScriptFromPromptTemplate(templateName) : undefined;
  const withTemplate = template ? mergeScripts(template, withStyle) : withStyle;

  // Add version if not present
  const withVersion = addMulmocastVersion(withTemplate);

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
