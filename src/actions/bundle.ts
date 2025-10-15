import path from "path";
import fs from "fs";
import { GraphAILogger } from "graphai";
import { type MulmoStudioContext, type MulmoBeat } from "../types/index.js";
import { listLocalizedAudioPaths } from "./audio.js";
import { imagePreprocessAgent } from "./image_agents.js";
import { mkdir } from "../utils/file.js";
import { ZipBuilder } from "../utils/zip.js";

const beatImage = (context: MulmoStudioContext) => {
  return async (beat: MulmoBeat, index: number) => {
    try {
      const res = await imagePreprocessAgent({ context, beat, index, imageRefs: {} });
      if ("htmlPrompt" in res) {
        return { htmlImageFile: res.htmlImageFile, imagePath: res.imagePath };
      }
      const { imagePath, movieFile, lipSyncFile } = res;
      return { imagePath, movieFile, lipSyncFile };
    } catch (e) {
      GraphAILogger.log(e);
      return {};
    }
  };
};

type BundleItem = {
  audio?: string;
  htmlImageFile?: string;
  imagePath?: string;
  movieFile?: string;
  lipSyncFile?: string;
};

export const mulmoViewerBundle = async (context: MulmoStudioContext) => {
  const isZip = true;

  const audios = listLocalizedAudioPaths(context);
  const images = await Promise.all(context.studio.script.beats.map(beatImage(context)));
  const dir = path.resolve(context.fileDirs.fileName);
  mkdir(dir);
  const zipper = new ZipBuilder(path.resolve(dir, "mulmo.zip"));

  const resultJson: BundleItem[] = [];
  audios.forEach((audio) => {
    if (audio) {
      const fileName = path.basename(audio ?? "");
      resultJson.push({ audio: fileName });
      if (fs.existsSync(audio)) {
        fs.copyFileSync(audio, path.resolve(dir, fileName));
        zipper.addFile(audio, fileName);
      }
    } else {
      resultJson.push({});
    }
  });
  images.forEach((image, index) => {
    const data = resultJson[index];
    const keys: Exclude<keyof BundleItem, "audio">[] = ["htmlImageFile", "imagePath", "movieFile", "lipSyncFile"];
    keys.forEach((key) => {
      const value = image[key];
      if (value) {
        data[key] = path.basename(value);
        if (fs.existsSync(value)) {
          fs.copyFileSync(value, path.resolve(dir, path.basename(value)));
          zipper.addFile(value);
        }
      }
    });
    // console.log(index, image);
  });
  const viewJsonFileName = "mulmo_view.json";
  fs.writeFileSync(path.resolve(dir), JSON.stringify(resultJson, null, 2));
  zipper.addFile(path.resolve(dir, "mulmo_view.json"));
  if (isZip) {
    await zipper.finalize();
  }
};
