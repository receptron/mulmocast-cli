import { MulmoBeat, MulmoStudioMultiLingualData } from "../types/index.js";

import { findImagePlugin } from "../utils/image_plugins/index.js";

export const MulmoBeatMethods = {
  getHtmlPrompt(beat: MulmoBeat) {
    if (beat?.htmlPrompt?.data) {
      return beat.htmlPrompt.prompt + "\n\n[data]\n" + JSON.stringify(beat.htmlPrompt.data, null, 2);
    }
    return beat?.htmlPrompt?.prompt;
  },
  getPlugin(beat: MulmoBeat) {
    const plugin = findImagePlugin(beat?.image?.type);
    if (!plugin) {
      throw new Error(`invalid beat image type: ${beat.image}`);
    }
    return plugin;
  },
  getImageReferenceForImageGenerator(beat: MulmoBeat, imageRefs: Record<string, string>) {
    const imageNames = beat.imageNames ?? Object.keys(imageRefs); // use all images if imageNames is not specified
    const sources = imageNames.map((name) => imageRefs[name]);
    return sources.filter((source) => source !== undefined);
  },
  localizedText(beat: MulmoBeat, multiLingualData?: MulmoStudioMultiLingualData, targetLang?: string, defaultLang?: string) {
    if (targetLang === defaultLang) {
      return beat.text;
    }
    if (targetLang && multiLingualData?.multiLingualTexts?.[targetLang]?.text) {
      return multiLingualData.multiLingualTexts[targetLang].text;
    }
    return beat.text;
  },
};
