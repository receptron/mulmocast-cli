import {
  langSchema,
  localizedTextSchema,
  mulmoBeatSchema,
  mulmoScriptSchema,
  mulmoStudioSchema,
  mulmoStudioBeatSchema,
  mulmoStoryboardSchema,
  mulmoStoryboardSceneSchema,
  speakerDictionarySchema,
  mulmoImageParamsSchema,
  mulmoSpeechParamsSchema,
  textSlideParamsSchema,
  speechOptionsSchema,
  mulmoCanvasDimensionSchema,
  mulmoScriptTemplateSchema,
  text2ImageProviderSchema,
  text2SpeechProviderSchema,
  mulmoPresentationStyleSchema,
} from "./schema.js";
import { z } from "zod";

export type LANG = z.infer<typeof langSchema>;
export type MulmoBeat = z.infer<typeof mulmoBeatSchema>;
export type SpeakerDictonary = z.infer<typeof speakerDictionarySchema>;
export type MulmoSpeechParams = z.infer<typeof mulmoSpeechParamsSchema>;
export type SpeechOptions = z.infer<typeof speechOptionsSchema>;
export type MulmoImageParams = z.infer<typeof mulmoImageParamsSchema>;
export type TextSlideParams = z.infer<typeof textSlideParamsSchema>;
export type Text2ImageProvider = z.infer<typeof text2ImageProviderSchema>;
export type Text2SpeechProvider = z.infer<typeof text2SpeechProviderSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type MulmoScript = z.infer<typeof mulmoScriptSchema>;
export type MulmoPresentationStyle = z.infer<typeof mulmoPresentationStyleSchema>;
export type MulmoCanvasDimension = z.infer<typeof mulmoCanvasDimensionSchema>;
export type MulmoStoryboardScene = z.infer<typeof mulmoStoryboardSceneSchema>;
export type MulmoStoryboard = z.infer<typeof mulmoStoryboardSchema>;
export type MulmoStudioBeat = z.infer<typeof mulmoStudioBeatSchema>;

export type MulmoStudio = z.infer<typeof mulmoStudioSchema>;
export type MulmoScriptTemplate = z.infer<typeof mulmoScriptTemplateSchema>;

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
  force: boolean;
};

export type ScriptingParams = {
  urls: string[];
  outDirPath: string;
  cacheDirPath: string;
  templateName: string;
  filename: string;
  llm_model: string;
  llm_agent: string;
};

export type ImageProcessorParams = {
  beat: MulmoBeat;
  context: MulmoStudioContext;
  imagePath: string;
  textSlideStyle: string;
  canvasSize: MulmoCanvasDimension;
};
