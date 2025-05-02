import { langSchema, localizedTextSchema, mulmoBeatSchema, mulmoScriptSchema, mulmoStudioSchema, mulmoStudioBeatSchema, speakerDictionarySchema, text2imageParamsSchema, text2speechParamsSchema, textSlideParamsSchema, mulmoDimensionSchema } from "./schema";
import { z } from "zod";
export type LANG = z.infer<typeof langSchema>;
export type MulmoBeat = z.infer<typeof mulmoBeatSchema>;
export type SpeakerDictonary = z.infer<typeof speakerDictionarySchema>;
export type Text2speechParams = z.infer<typeof text2speechParamsSchema>;
export type Text2imageParams = z.infer<typeof text2imageParamsSchema>;
export type TextSlideParams = z.infer<typeof textSlideParamsSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type MulmoScript = z.infer<typeof mulmoScriptSchema>;
export type MulmoDimension = z.infer<typeof mulmoDimensionSchema>;
export type MulmoStudioBeat = z.infer<typeof mulmoStudioBeatSchema>;
export type MulmoStudio = z.infer<typeof mulmoStudioSchema>;
export type FileDirs = {
    baseDirPath: string;
    mulmoFilePath: string;
    outDirPath: string;
    imageDirPath: string;
};
