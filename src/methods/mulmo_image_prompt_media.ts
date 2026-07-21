import { GraphAILogger } from "graphai";
import { MulmoImagePromptMedia, MulmoImageReference, Text2ImageAgentInfo } from "../types/index.js";
import { getMaxImageReferenceImages, provider2ImageAgent } from "../types/provider2agent.js";

export type MulmoNormalizedImageReference = MulmoImageReference & {
  // true for entries normalized from the legacy referenceImageName/referenceImage fields.
  // Kept so url downloads keep their historical cache file names.
  legacy?: boolean;
};

export type ResolvedImageReference = { path: string; label?: string };

export const MulmoImagePromptMediaMethods = {
  // Normalized reference list: legacy single-ref fields first, then the references array.
  // When both legacy fields are set, referenceImageName wins and referenceImage is ignored,
  // matching the pre-references resolution behavior.
  getReferences(image: MulmoImagePromptMedia): MulmoNormalizedImageReference[] {
    const references: MulmoNormalizedImageReference[] = [];
    if (image.referenceImageName) {
      references.push({ name: image.referenceImageName, legacy: true });
    } else if (image.referenceImage) {
      references.push({ source: image.referenceImage, legacy: true });
    }
    references.push(...(image.references ?? []));
    return references;
  },
  // Entries with a named reference must resolve after stage 1 (which generates/loads the named images).
  hasNamedReference(image: MulmoImagePromptMedia): boolean {
    return this.getReferences(image).some((ref) => ref.name !== undefined);
  },
  // "Reference image 1 shows <label>. ... Use these exact designs.\n"
  // Empty when no reference has a label, keeping label-free prompts byte-identical to before.
  buildReferencePreamble(labels: (string | undefined)[]): string {
    const sentences = labels.map((label, index) => (label ? `Reference image ${index + 1} shows ${label}.` : undefined)).filter((s) => s !== undefined);
    if (sentences.length === 0) {
      return "";
    }
    return `${sentences.join(" ")} Use these exact designs.\n`;
  },
  // Truncate to the provider/model limit, keeping the first N deterministically.
  // imageKey is the imageRefs key of the image being generated (used for the warning).
  limitReferences(references: ResolvedImageReference[] | undefined, imageAgentInfo: Text2ImageAgentInfo, imageKey: string) {
    if (!references) {
      return undefined;
    }
    const provider = imageAgentInfo.imageParams.provider as keyof typeof provider2ImageAgent;
    const max = getMaxImageReferenceImages(provider, imageAgentInfo.imageParams.model ?? "");
    if (max !== undefined && references.length > max) {
      GraphAILogger.warn(`imagePrompt "${imageKey}": ${references.length} reference images exceed the ${provider} limit of ${max} — keeping the first ${max}`);
      return references.slice(0, max);
    }
    return references;
  },
};
