import { getAspectRatio } from "./utils.js";

// Gemini Omni video goes through the Interactions API: one call makes 3 to 10 whole seconds, and a call that
// names the previous interaction extends that video, up to 40 seconds in all.
export const GEMINI_OMNI_MIN_SEGMENT_SEC = 3;
export const GEMINI_OMNI_MAX_SEGMENT_SEC = 10;
export const GEMINI_OMNI_MAX_TOTAL_SEC = 40;
export const GEMINI_OMNI_RESOLUTION = "720p";
const GEMINI_OMNI_ASPECT_RATIOS = ["16:9", "9:16"];

export const isGeminiOmniVideoModel = (model: string): boolean => model.startsWith("gemini-omni-");

export const geminiOmniTotalSec = (requestedSec: number): number => {
  if (!Number.isFinite(requestedSec)) throw new RangeError(`Invalid video duration: ${requestedSec}`);
  return Math.min(Math.max(Math.ceil(requestedSec), GEMINI_OMNI_MIN_SEGMENT_SEC), GEMINI_OMNI_MAX_TOTAL_SEC);
};

// Split evenly so no segment falls under the 3-second minimum (11s is 6 + 5, not 10 + 1).
export const geminiOmniSegments = (requestedSec: number): number[] => {
  const totalSec = geminiOmniTotalSec(requestedSec);
  const count = Math.ceil(totalSec / GEMINI_OMNI_MAX_SEGMENT_SEC);
  const baseSec = Math.floor(totalSec / count);
  return Array.from({ length: count }, (_, index) => baseSec + (index < totalSec % count ? 1 : 0));
};

export const geminiOmniAspectRatio = (canvasSize: { width: number; height: number }): string => getAspectRatio(canvasSize, GEMINI_OMNI_ASPECT_RATIOS);

export type GeminiOmniImage = { data: string; mime_type: string };

export type GeminiOmniVideoRequestInput = {
  model: string;
  prompt: string;
  aspectRatio: string;
  durationSec: number;
  frames?: GeminiOmniImage[];
  previousInteractionId?: string;
};

export const geminiOmniExtensionPrompt = (prompt: string): string => `The scene continues: ${prompt}`;

export const buildGeminiOmniVideoRequest = ({ model, prompt, aspectRatio, durationSec, frames = [], previousInteractionId }: GeminiOmniVideoRequestInput) => ({
  model,
  input: frames.length > 0 ? [...frames.map((frame) => ({ type: "image" as const, ...frame })), { type: "text" as const, text: prompt }] : prompt,
  ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
  response_format: { type: "video" as const, aspect_ratio: aspectRatio, resolution: GEMINI_OMNI_RESOLUTION, duration: `${durationSec}s` },
});

export type GeminiOmniVideoRequest = ReturnType<typeof buildGeminiOmniVideoRequest>;

type InteractionVideo = { data?: string; mime_type?: string };

export const videoFromInteraction = (video: InteractionVideo | undefined): Buffer => {
  if (!video?.data) throw new Error("No video data returned");
  if (video.mime_type !== "video/mp4") throw new Error(`Gemini Omni returned ${video.mime_type ?? "video of an unknown type"}, expected video/mp4`);
  return Buffer.from(video.data, "base64");
};
