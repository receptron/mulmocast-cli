import { type CallbackFunction } from "graphai";
import {
  langSchema,
  localizedTextSchema,
  mulmoBeatSchema,
  mulmoScriptSchema,
  mulmoStudioSchema,
  mulmoStudioBeatSchema,
  mulmoStoryboardSchema,
  mulmoStoryboardSceneSchema,
  mulmoStudioMultiLingualSchema,
  mulmoStudioMultiLingualArraySchema,
  mulmoStudioMultiLingualDataSchema,
  mulmoStudioMultiLingualFileSchema,
  speakerDictionarySchema,
  speakerSchema,
  mulmoSpeechParamsSchema,
  mulmoImageParamsSchema,
  mulmoImageParamsImagesValueSchema,
  mulmoImageParamsImagesSchema,
  mulmoFillOptionSchema,
  mulmoTransitionSchema,
  mulmoVideoFilterSchema,
  mulmoMovieParamsSchema,
  mulmoSoundEffectParamsSchema,
  mulmoLipSyncParamsSchema,
  textSlideParamsSchema,
  speechOptionsSchema,
  speakerDataSchema,
  mulmoCanvasDimensionSchema,
  mulmoPromptTemplateSchema,
  mulmoPromptTemplateFileSchema,
  text2ImageProviderSchema,
  text2HtmlImageProviderSchema,
  text2MovieProviderSchema,
  text2SpeechProviderSchema,
  mulmoPresentationStyleSchema,
  multiLingualTextsSchema,
  // for image
  mulmoImageAssetSchema,
  mulmoMermaidMediaSchema,
  mulmoTextSlideMediaSchema,
  mulmoMarkdownMediaSchema,
  mulmoImageMediaSchema,
  mulmoChartMediaSchema,
  mediaSourceSchema,
  mediaSourceMermaidSchema,
  backgroundImageSchema,
  backgroundImageSourceSchema,
  mulmoSessionStateSchema,
  mulmoOpenAIImageModelSchema,
  mulmoGoogleImageModelSchema,
  mulmoGoogleMovieModelSchema,
  mulmoReplicateMovieModelSchema,
  mulmoImagePromptMediaSchema,
  markdownLayoutSchema,
  row2Schema,
  grid2x2Schema,
} from "./schema.js";
import { pdf_modes, pdf_sizes, storyToScriptGenerateMode } from "./const.js";
import type { LLM } from "./provider2agent.js";
import { z } from "zod";

export type LANG = z.infer<typeof langSchema>;
export type MulmoBeat = z.infer<typeof mulmoBeatSchema>;
export type MulmoSpeechParams = z.infer<typeof mulmoSpeechParamsSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type SpeakerDictonary = z.infer<typeof speakerDictionarySchema>;
export type SpeechOptions = z.infer<typeof speechOptionsSchema>;
export type SpeakerData = z.infer<typeof speakerDataSchema>;
export type MulmoImageParams = z.infer<typeof mulmoImageParamsSchema>;
export type MulmoImageParamsImagesValue = z.infer<typeof mulmoImageParamsImagesValueSchema>;
export type MulmoImageParamsImages = z.infer<typeof mulmoImageParamsImagesSchema>;
export type MulmoFillOption = z.infer<typeof mulmoFillOptionSchema>;
export type MulmoTransition = z.infer<typeof mulmoTransitionSchema>;
export type MulmoVideoFilter = z.infer<typeof mulmoVideoFilterSchema>;
export type TextSlideParams = z.infer<typeof textSlideParamsSchema>;
export type Text2ImageProvider = z.infer<typeof text2ImageProviderSchema>;
export type Text2HtmlImageProvider = z.infer<typeof text2HtmlImageProviderSchema>;
export type Text2MovieProvider = z.infer<typeof text2MovieProviderSchema>;
export type Text2SpeechProvider = z.infer<typeof text2SpeechProviderSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type MulmoScript = z.infer<typeof mulmoScriptSchema>;
export type MulmoPresentationStyle = z.infer<typeof mulmoPresentationStyleSchema>;
export type MulmoCanvasDimension = z.infer<typeof mulmoCanvasDimensionSchema>;
export type MulmoStoryboardScene = z.infer<typeof mulmoStoryboardSceneSchema>;
export type MulmoStoryboard = z.infer<typeof mulmoStoryboardSchema>;
export type MulmoStudioBeat = z.infer<typeof mulmoStudioBeatSchema>;
export type MulmoMediaSource = z.infer<typeof mediaSourceSchema>;
export type MulmoMediaMermaidSource = z.infer<typeof mediaSourceMermaidSchema>;
export type BackgroundImage = z.infer<typeof backgroundImageSchema>;
export type BackgroundImageSource = z.infer<typeof backgroundImageSourceSchema>;
export type MulmoStudio = z.infer<typeof mulmoStudioSchema>;
export type MulmoPromptTemplate = z.infer<typeof mulmoPromptTemplateSchema>;
export type MulmoPromptTemplateFile = z.infer<typeof mulmoPromptTemplateFileSchema>;
export type MulmoStudioMultiLingual = z.infer<typeof mulmoStudioMultiLingualSchema>;
export type MulmoStudioMultiLingualArray = z.infer<typeof mulmoStudioMultiLingualArraySchema>;
export type MulmoStudioMultiLingualData = z.infer<typeof mulmoStudioMultiLingualDataSchema>;
export type MulmoStudioMultiLingualFile = z.infer<typeof mulmoStudioMultiLingualFileSchema>;
export type MultiLingualTexts = z.infer<typeof multiLingualTextsSchema>;
export type MulmoMovieParams = z.infer<typeof mulmoMovieParamsSchema>;
export type MulmoSoundEffectParams = z.infer<typeof mulmoSoundEffectParamsSchema>;
export type MulmoLipSyncParams = z.infer<typeof mulmoLipSyncParamsSchema>;
export type MulmoOpenAIImageModel = z.infer<typeof mulmoOpenAIImageModelSchema>;
export type MulmoGoogleImageModel = z.infer<typeof mulmoGoogleImageModelSchema>;
export type MulmoGoogleMovieModel = z.infer<typeof mulmoGoogleMovieModelSchema>;
export type MulmoReplicateMovieModel = z.infer<typeof mulmoReplicateMovieModelSchema>;
export type MulmoImagePromptMedia = z.infer<typeof mulmoImagePromptMediaSchema>;

export type MulmoMarkdownLayout = z.infer<typeof markdownLayoutSchema>;
export type MulmoRow2 = z.infer<typeof row2Schema>;
export type MulmoGrid2x2 = z.infer<typeof grid2x2Schema>;

// images
export type MulmoImageAsset = z.infer<typeof mulmoImageAssetSchema>;
export type MulmoTextSlideMedia = z.infer<typeof mulmoTextSlideMediaSchema>;
export type MulmoMarkdownMedia = z.infer<typeof mulmoMarkdownMediaSchema>;
export type MulmoImageMedia = z.infer<typeof mulmoImageMediaSchema>;
export type MulmoChartMedia = z.infer<typeof mulmoChartMediaSchema>;
export type MulmoMermaidMedia = z.infer<typeof mulmoMermaidMediaSchema>;
export type MulmoSessionState = z.infer<typeof mulmoSessionStateSchema>;

export type MulmoStudioContext = {
  fileDirs: FileObject;
  studio: MulmoStudio;
  lang: string;
  force: boolean;
  sessionState: MulmoSessionState;
  presentationStyle: MulmoPresentationStyle;
  multiLingual: MulmoStudioMultiLingualArray;
};

export type ScriptingParams = {
  urls: string[];
  outDirPath: string;
  cacheDirPath: string;
  templateName: string;
  filename: string;
  llm_model?: string;
  llm?: LLM;
  verbose?: boolean;
};

export type ImageProcessorParams = {
  beat: MulmoBeat;
  context: MulmoStudioContext;
  imagePath: string;
  textSlideStyle: string;
  canvasSize: MulmoCanvasDimension;
  imageRefs?: Record<string, string>;
  beatDuration?: number; // Computed duration: beat.duration ?? studioBeat.duration (audio-derived)
};

export type PDFMode = (typeof pdf_modes)[number];
export type PDFSize = (typeof pdf_sizes)[number];

export type Text2ImageAgentInfo = {
  agent: string;
  imageParams: MulmoImageParams;
  keyName?: string;
};

export type Text2HtmlAgentInfo = {
  provider: Text2HtmlImageProvider;
  agent: string;
  model: string;
  max_tokens: number;
};

export type BeatMediaType = "movie" | "image";

export type StoryToScriptGenerateMode = (typeof storyToScriptGenerateMode)[keyof typeof storyToScriptGenerateMode];

export type SessionType = "audio" | "image" | "video" | "multiLingual" | "caption" | "pdf" | "markdown" | "html";
export type BeatSessionType = "audio" | "image" | "multiLingual" | "caption" | "movie" | "html" | "imageReference" | "soundEffect" | "lipSync";

export type SessionProgressEvent =
  | { kind: "session"; sessionType: SessionType; inSession: boolean; result?: boolean }
  | { kind: "beat"; sessionType: BeatSessionType; id: string; inSession: boolean };

export type SessionProgressCallback = (change: SessionProgressEvent) => void;

export interface FileObject {
  baseDirPath: string;
  mulmoFilePath: string;
  mulmoFileDirPath: string;
  outDirPath: string;
  imageDirPath: string;
  audioDirPath: string;
  nodeModuleRootPath?: string;

  isHttpPath: boolean;
  fileOrUrl: string;
  outputStudioFilePath: string;
  outputMultilingualFilePath: string;
  presentationStylePath: string | undefined;
  fileName: string;
  grouped: boolean;
}

export type InitOptions = {
  b?: string;
  o?: string;
  i?: string;
  a?: string;
  file?: string;
  l?: string;
  c?: string;
  p?: string;
  g?: boolean;
};

export type PublicAPIArgs = {
  settings?: Record<string, string>;
  callbacks?: CallbackFunction[];
};

export type ImageType = "image" | "movie";
