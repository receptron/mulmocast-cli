import { type ZodSafeParseResult } from "zod";
import { mulmoScriptSchema } from "../types/schema.js";
import { getScriptFromPromptTemplate } from "../utils/file.js";
import { currentMulmoScriptVersion } from "../types/const.js";
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
 * Merge input data with template (input takes precedence)
 */
export const mergeWithTemplate = (data: PartialMulmoScript, template: MulmoScript): PartialMulmoScript => {
  const merged: PartialMulmoScript = { ...template, ...data };

  deepMergeKeys.forEach((key) => {
    if (template[key] && data[key]) {
      merged[key] = { ...template[key], ...(data[key] as object) };
    }
  });

  return merged;
};

export type CompleteScriptResult = ZodSafeParseResult<MulmoScript>;

/**
 * Complete a partial MulmoScript with schema defaults and optional template
 */
export const completeScript = (data: PartialMulmoScript, templateName?: string): CompleteScriptResult => {
  const withVersion = addMulmocastVersion(data);

  const withTemplate = templateName
    ? (() => {
        const template = getScriptFromPromptTemplate(templateName);
        return template ? mergeWithTemplate(withVersion, template) : withVersion;
      })()
    : withVersion;

  return mulmoScriptSchema.safeParse(withTemplate);
};

/**
 * Check if template exists
 */
export const templateExists = (templateName: string): boolean => {
  return getScriptFromPromptTemplate(templateName) !== undefined;
};
