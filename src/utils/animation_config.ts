/**
 * Reading an html_tailwind `animation` value. Pure and dependency-free — the PNG render and the
 * browser fragment path decide "is this animated, at what fps" the same way, and the browser
 * bundle must not reach the schema module to do it.
 */

export type AnimationConfig = { fps?: number; movie?: boolean };

/** Type guard: checks if animation value is an object config like { fps: 30 } */
export const isAnimationObject = (animation: unknown): animation is AnimationConfig => {
  return typeof animation === "object" && animation !== null && !Array.isArray(animation);
};

/** Check if a value is a valid animation config (true or non-array object) */
export const isAnimationEnabled = (animation: unknown): animation is true | AnimationConfig => {
  return animation === true || isAnimationObject(animation);
};

/** Check if movie mode (CDP screencast) is enabled */
export const isMovieMode = (animation: unknown): boolean => {
  return isAnimationObject(animation) && animation.movie === true;
};
