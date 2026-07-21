import { MulmoImagePromptMedia, MulmoImageReference } from "../types/index.js";

export type MulmoNormalizedImageReference = MulmoImageReference & {
  // true for entries normalized from the legacy referenceImageName/referenceImage fields.
  // Kept so url downloads keep their historical cache file names.
  legacy?: boolean;
};

export const MulmoImagePromptMediaMethods = {
  // Normalized reference list: legacy single-ref fields first, then the references array.
  getReferences(image: MulmoImagePromptMedia): MulmoNormalizedImageReference[] {
    const references: MulmoNormalizedImageReference[] = [];
    if (image.referenceImageName) {
      references.push({ name: image.referenceImageName, legacy: true });
    }
    if (image.referenceImage) {
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
};
