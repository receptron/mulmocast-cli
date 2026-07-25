import { MulmoBeat, ImageMediaType } from "../types/index.js";

type AnimationConfig = { fps?: number; movie?: boolean };

/** Type guard: checks if animation value is an object config like { fps: 30 } */
const isAnimationObject = (animation: unknown): animation is AnimationConfig => {
  return typeof animation === "object" && animation !== null && !Array.isArray(animation);
};

/** Check if a value is a valid animation config (true or non-array object) */
const isAnimationEnabled = (animation: unknown): animation is true | AnimationConfig => {
  return animation === true || isAnimationObject(animation);
};

/** Check if movie mode (CDP screencast) is enabled */
const isMovieMode = (animation: unknown): boolean => {
  return isAnimationObject(animation) && animation.movie === true;
};

/** Check if a beat has html_tailwind animation enabled */
const isAnimatedHtmlTailwind = (beat: MulmoBeat): boolean => {
  if (!beat.image || beat.image.type !== "html_tailwind") return false;
  const animation = (beat.image as { animation?: unknown }).animation;
  return isAnimationEnabled(animation);
};

// voice_over beats share the preceding beat's shot, and contribute no video segment of their own.
const isVoiceOver = (beat?: MulmoBeat) => beat?.image?.type === ImageMediaType.VoiceOver;

export const MulmoBeatMethods = {
  isAnimationEnabled,
  isAnimationObject,
  isAnimatedHtmlTailwind,
  isMovieMode,
  isVoiceOver,
  // Index of the closest preceding beat which is actually rendered as a video segment (-1 if none).
  getPrevRenderedBeatIndex(beats: MulmoBeat[], index: number) {
    const offset = beats
      .slice(0, Math.max(index, 0))
      .reverse()
      .findIndex((beat) => !isVoiceOver(beat));
    return offset < 0 ? -1 : index - 1 - offset;
  },
  // Index of the closest following beat which is actually rendered as a video segment (-1 if none).
  getNextRenderedBeatIndex(beats: MulmoBeat[], index: number) {
    const offset = beats.slice(index + 1).findIndex((beat) => !isVoiceOver(beat));
    return offset < 0 ? -1 : index + 1 + offset;
  },
  getHtmlPrompt(beat: MulmoBeat) {
    if (beat?.htmlPrompt?.data) {
      return beat.htmlPrompt.prompt + "\n\n[data]\n" + JSON.stringify(beat.htmlPrompt.data, null, 2);
    }
    return beat?.htmlPrompt?.prompt;
  },
  getImageReferenceForImageGenerator(beat: MulmoBeat, imageRefs: Record<string, string>) {
    const imageNames = beat.imageNames ?? Object.keys(imageRefs); // use all images if imageNames is not specified
    const sources = imageNames.map((name) => imageRefs[name]);
    return sources.filter((source) => source !== undefined);
  },
};
