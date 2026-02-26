import { MulmoBeat } from "../types/index.js";

import { findImagePlugin } from "../utils/image_plugins/index.js";

/** Check if a value is a valid animation config (true or non-array object) */
const isAnimationEnabled = (animation: unknown): boolean => {
  return animation === true || (typeof animation === "object" && animation !== null && !Array.isArray(animation));
};

/** Check if a beat has html_tailwind animation enabled */
const isAnimatedHtmlTailwind = (beat: MulmoBeat): boolean => {
  if (!beat.image || beat.image.type !== "html_tailwind") return false;
  const animation = (beat.image as { animation?: unknown }).animation;
  return isAnimationEnabled(animation);
};

export const MulmoBeatMethods = {
  isAnimationEnabled,
  isAnimatedHtmlTailwind,
  getHtmlPrompt(beat: MulmoBeat) {
    if (beat?.htmlPrompt?.data) {
      return beat.htmlPrompt.prompt + "\n\n[data]\n" + JSON.stringify(beat.htmlPrompt.data, null, 2);
    }
    return beat?.htmlPrompt?.prompt;
  },
  getPlugin(beat: MulmoBeat) {
    const plugin = findImagePlugin(beat?.image?.type);
    if (!plugin) {
      throw new Error(`invalid beat image type: ${beat.image}`); // TODO: cause
    }
    return plugin;
  },
  getImageReferenceForImageGenerator(beat: MulmoBeat, imageRefs: Record<string, string>) {
    const imageNames = beat.imageNames ?? Object.keys(imageRefs); // use all images if imageNames is not specified
    const sources = imageNames.map((name) => imageRefs[name]);
    return sources.filter((source) => source !== undefined);
  },
};
