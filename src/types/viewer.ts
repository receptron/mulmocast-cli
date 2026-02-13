import { z } from "zod";

export const mulmoViewerBeatSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  duration: z.number().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  importance: z.number().optional(),
  multiLinguals: z.record(z.string(), z.string()).optional(),
  audioSources: z.record(z.string(), z.string().optional()).optional(),
  imageSource: z.string().optional(),
  videoSource: z.string().optional(),
  videoWithAudioSource: z.string().optional(),
  htmlImageSource: z.string().optional(),
  soundEffectSource: z.string().optional(),
});

export type MulmoViewerBeat = z.infer<typeof mulmoViewerBeatSchema>;

export const mulmoViewerDataSchema = z.object({
  beats: z.array(mulmoViewerBeatSchema),
  bgmSource: z.string().optional(),
  bgmFile: z.string().optional(),
  title: z.string().optional(),
  lang: z.string().optional(),
});

export type MulmoViewerData = z.infer<typeof mulmoViewerDataSchema>;
