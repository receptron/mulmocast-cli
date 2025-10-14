import path from "path";
import fs from "fs";
import { GraphAILogger } from "graphai";
import { MulmoPresentationStyleMethods } from "../methods/index.js";
import { type MulmoStudioContext, type MulmoBeat } from "../types/index.js";
import { listLocalizedAudioPaths } from "./audio.js";
import { imagePreprocessAgent } from "./image_agents.js";
import { mkdir } from "../utils/file.js";

const beatImage = (context: MulmoStudioContext) => {
  return async (beat: MulmoBeat, index: number) => {
    try {
      const res = await imagePreprocessAgent({ context, beat, index, imageRefs: {} });
      const { htmlImageFile, imagePath, movieFile, lipSyncFile } = res;
      return { htmlImageFile, imagePath, movieFile, lipSyncFile };
    } catch (e) {
      GraphAILogger.log(e);
      return {};
    }
  };
};

export const mulmoViewerBundle = async (context: MulmoStudioContext) => {
  const audios = listLocalizedAudioPaths(context);
  const images = await Promise.all(context.studio.script.beats.map(beatImage(context)));
  const dir = path.resolve(context.fileDirs.fileName);
  mkdir(dir);
  const resultJson: unknown[] = [];
  audios.forEach((audio) => {
    if (audio) {
      const fileName = path.basename(audio ?? "");
      resultJson.push({ audio: fileName });
      if (fs.existsSync(audio)) {
        fs.copyFileSync(audio, path.resolve(dir, fileName));
      }
    } else {
      resultJson.push({});
    }
  });
  images.forEach((image, index) => {
    const data = resultJson[index];
    ["htmlImageFile", "imagePath", "movieFile", "lipSyncFile"].forEach((key) => {
      if (image[key]) {
        data[key] = path.basename(image[key]);
        if (fs.existsSync(image[key])) {
          fs.copyFileSync(image[key], path.resolve(dir, path.basename(image[key])));
        }
      }
    });
    // console.log(index, image);
  });
  fs.writeFileSync(path.resolve(dir, "mulmo_view.json"), JSON.stringify(resultJson, null, 2));
};
