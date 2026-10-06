// The same moments the visual review looks at; a host reviewing its own component gets these by default.
export const REMOTION_REVIEW_FRACTIONS: readonly number[] = [0.3, 0.6, 0.95];

export const toFrameCount = (durationSec: number, fps: number) => {
  const frames = Math.floor(durationSec * fps);
  if (frames <= 0) {
    throw new Error(`remotion: frame count is ${frames} (duration=${durationSec}, fps=${fps}). Increase duration or fps.`);
  }
  return frames;
};

// Clamped to the last frame, so a fraction of 1 is the final frame rather than one past it.
export const frameAtFraction = (durationInFrames: number, fraction: number) => Math.min(durationInFrames - 1, Math.floor(durationInFrames * fraction));
