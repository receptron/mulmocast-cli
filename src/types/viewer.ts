export type MulmoViewerBeat = {
  text?: string;
  duration?: number;
  startTime?: number;
  endTime?: number;
  importance?: number;
  multiLinguals?: Record<string, string>;
  audioSources?: Record<string, string | undefined>;
  imageSource?: string;
  videoSource?: string;
  videoWithAudioSource?: string;
  htmlImageSource?: string;
  soundEffectSource?: string;
};

export type MulmoViewerData = {
  beats: MulmoViewerBeat[];
  bgmSource?: string;
  bgmFile?: string;
  title?: string;
  lang?: string;
};
