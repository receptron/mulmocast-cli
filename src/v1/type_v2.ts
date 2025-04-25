type LANG = string;
type URLString = string;

type LocalizedText = {
  text: string;
  lang: LANG;
  captions: string;
  ttsTexts: string;

  duration: number; // generated // video duration time (ms)
  filename: string; // generated //
};

type SpeakerId = string;
type SpeakerData = {
  displayName: Record<LANG, string>;
  voiceId: string;
};
type SpeakerDictonary = Record<SpeakerId, SpeakerData>;

//
type MediaSource =
  | { kind: "url"; url: URLString } // https://example.com/foo.pdf
  | { kind: "data"; data: string } // base64
  | { kind: "file"; filename: string }; //

type MulmoMarkdownMedia = {
  type: "markdown";
  markdown: string;
};

type MulmoWebMedia = {
  type: "web";
  url: URLString;
};

type MulmoPdfMedia = {
  type: "pdf";
  source: MediaSource;
};

type MulmoImageMedia = {
  type: "image";
  source: MediaSource;
};

type MulmoSvgMedia = {
  type: "svg";
  source: MediaSource;
};

type MulmoMovieMedia = {
  type: "movie";
  source: MediaSource;
};

export type MulmoMedia = MulmoMarkdownMedia | MulmoWebMedia | MulmoPdfMedia | MulmoImageMedia | MulmoSvgMedia | MulmoMovieMedia;

// Beat Data
export type MulmoBeat = {
  speaker: SpeakerId;
  text: string;

  multiLingualText: Record<LANG, LocalizedText>;

  media?: MulmoMedia;

  // ttsText: string | undefined;
  instructions: string | undefined; // tts_options for open ai

  imagePrompt: string | undefined; // inserted by LLM
  image: string | undefined; // path to the image
};

// export type VoiceMap = Record<SPEAKER, string>;

// epsode
export type MulmoScript = {
  // global setting
  title: string;
  description: string;
  reference: string;
  lang: LANG;

  // page/slide
  beats: MulmoBeat[];

  // for tts
  tts: string | undefined; // default: openAI
  speakers: SpeakerDictonary;
  // voicemap: VoiceMap; // generated

  // for graph data
  // voices: string[] | undefined;
  ttsAgent: string; // generated

  filename: string; // generated
  // imageInfo: any[]; // generated

  // for video and image
  aspectRatio: string | undefined; // "16:9" or "9:16" for movie and images
  // images: ImageInfo[]; // generated
  imagePath: string | undefined; // for Keynote images movie ??
  omitCaptions: boolean | undefined; // default is false

  // for bgm
  padding: number | undefined; // for bgm
};
