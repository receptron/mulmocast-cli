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
  mulmoStudioMultiLingualDataSchema,
  speakerDictionarySchema,
  mulmoImageParamsSchema,
  mulmoImageParamsImagesSchema,
  mulmoFillOptionSchema,
  mulmoMovieParamsSchema,
  mulmoSpeechParamsSchema,
  textSlideParamsSchema,
  speechOptionsSchema,
  speakerDataSchema,
  mulmoCanvasDimensionSchema,
  mulmoScriptTemplateSchema,
  mulmoScriptTemplateFileSchema,
  text2ImageProviderSchema,
  text2HtmlImageProviderSchema,
  text2MovieProviderSchema,
  text2SpeechProviderSchema,
  mulmoPresentationStyleSchema,
  multiLingualTextsSchema,
  // for image
  mulmoMermaidMediaSchema,
  mulmoTextSlideMediaSchema,
  mulmoMarkdownMediaSchema,
  mulmoImageMediaSchema,
  mulmoChartMediaSchema,
  mediaSourceSchema,
  mulmoSessionStateSchema,
  mulmoOpenAIImageModelSchema,
  mulmoGoogleImageModelSchema,
  mulmoGoogleMovieModelSchema,
  mulmoReplicateMovieModelSchema,
  mulmoImagePromptMediaSchema,
} from "./schema.js";
import { pdf_modes, pdf_sizes, storyToScriptGenerateMode } from "../utils/const.js";
import type { LLM } from "../utils/provider2agent.js";
import { z } from "zod";

export type LANG = z.infer<typeof langSchema>;
export type MulmoBeat = z.infer<typeof mulmoBeatSchema>;
export type SpeakerDictonary = z.infer<typeof speakerDictionarySchema>;

export type MulmoSpeechParams = z.infer<typeof mulmoSpeechParamsSchema>;
export type SpeechOptions = z.infer<typeof speechOptionsSchema>;
export type SpeakerData = z.infer<typeof speakerDataSchema>;
export type MulmoImageParams = z.infer<typeof mulmoImageParamsSchema>;
export type MulmoImageParamsImages = z.infer<typeof mulmoImageParamsImagesSchema>;
export type MulmoFillOption = z.infer<typeof mulmoFillOptionSchema>;
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
export type MulmoStudio = z.infer<typeof mulmoStudioSchema>;
export type MulmoScriptTemplate = z.infer<typeof mulmoScriptTemplateSchema>;
export type MulmoScriptTemplateFile = z.infer<typeof mulmoScriptTemplateFileSchema>;
export type MulmoStudioMultiLingual = z.infer<typeof mulmoStudioMultiLingualSchema>;
export type MulmoStudioMultiLingualData = z.infer<typeof mulmoStudioMultiLingualDataSchema>;
export type MultiLingualTexts = z.infer<typeof multiLingualTextsSchema>;
export type MulmoMovieParams = z.infer<typeof mulmoMovieParamsSchema>;
export type MulmoOpenAIImageModel = z.infer<typeof mulmoOpenAIImageModelSchema>;
export type MulmoGoogleImageModel = z.infer<typeof mulmoGoogleImageModelSchema>;
export type MulmoGoogleMovieModel = z.infer<typeof mulmoGoogleMovieModelSchema>;
export type MulmoReplicateMovieModel = z.infer<typeof mulmoReplicateMovieModelSchema>;
export type MulmoImagePromptMedia = z.infer<typeof mulmoImagePromptMediaSchema>;

// images
export type MulmoTextSlideMedia = z.infer<typeof mulmoTextSlideMediaSchema>;
export type MulmoMarkdownMedia = z.infer<typeof mulmoMarkdownMediaSchema>;
export type MulmoImageMedia = z.infer<typeof mulmoImageMediaSchema>;
export type MulmoChartMedia = z.infer<typeof mulmoChartMediaSchema>;
export type MulmoMermaidMedia = z.infer<typeof mulmoMermaidMediaSchema>;
export type MulmoSessionState = z.infer<typeof mulmoSessionStateSchema>;

export type FileDirs = {
  mulmoFilePath: string;
  mulmoFileDirPath: string;

  baseDirPath: string;
  outDirPath: string;
  imageDirPath: string;
  audioDirPath: string;
};

export type MulmoStudioContext = {
  fileDirs: FileDirs;
  studio: MulmoStudio;
  lang?: string;
  force: boolean;
  sessionState: MulmoSessionState;
  presentationStyle: MulmoPresentationStyle;
  multiLingual: MulmoStudioMultiLingual;
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
};

export type PDFMode = (typeof pdf_modes)[number];
export type PDFSize = (typeof pdf_sizes)[number];

export type Text2ImageAgentInfo = {
  agent: string;
  imageParams: MulmoImageParams;
};

export type Text2HtmlAgentInfo = {
  provider: Text2HtmlImageProvider;
  agent: string;
  model: string;
  max_tokens: number;
};

export type BeatMediaType = "movie" | "image";

export type StoryToScriptGenerateMode = (typeof storyToScriptGenerateMode)[keyof typeof storyToScriptGenerateMode];

export type SessionType = "audio" | "image" | "video" | "multiLingual" | "caption" | "pdf";
export type BeatSessionType = "audio" | "image" | "multiLingual" | "caption" | "movie" | "html" | "imageReference" | "soundEffect";

export type SessionProgressEvent =
  | { kind: "session"; sessionType: SessionType; inSession: boolean }
  | { kind: "beat"; sessionType: BeatSessionType; index: number; inSession: boolean };

export type SessionProgressCallback = (change: SessionProgressEvent) => void;

export interface FileObject {
  baseDirPath: string;
  mulmoFilePath: string;
  mulmoFileDirPath: string;
  outDirPath: string;
  imageDirPath: string;
  audioDirPath: string;
  isHttpPath: boolean;
  fileOrUrl: string;
  outputStudioFilePath: string;
  outputMultilingualFilePath: string;
  presentationStylePath: string | undefined;
  fileName: string;
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
};
