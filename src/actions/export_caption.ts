import fs from "fs";
import { MulmoStudioContext } from "../types/index.js";
import { MulmoStudioContextMethods } from "../methods/index.js";
import { generateSRT } from "../utils/srt.js";
import { localizedText } from "../utils/utils.js";
import { getOutputSrtFilePath, mkdir, writingMessage } from "../utils/file.js";

export const exportCaption = async (context: MulmoStudioContext): Promise<void> => {
  try {
    MulmoStudioContextMethods.setSessionState(context, "exportCaption", true);

    const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
    const fileName = MulmoStudioContextMethods.getFileName(context);
    const outputFilePath = getOutputSrtFilePath(outDirPath, fileName, context.lang);

    mkdir(outDirPath);

    const getTextForBeat = (index: number): string => {
      const beat = context.studio.script.beats[index];
      return localizedText(beat, context.multiLingual?.[index], context.lang);
    };

    const srtContent = generateSRT(context.studio.beats, getTextForBeat);

    await fs.promises.writeFile(outputFilePath, srtContent, "utf8");
    writingMessage(outputFilePath);
  } finally {
    MulmoStudioContextMethods.setSessionState(context, "exportCaption", false);
  }
};
