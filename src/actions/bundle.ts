import path from "path";
import fs from "fs";
import { GraphAILogger } from "graphai";
import { type MulmoStudioContext, type MulmoBeat } from "../types/index.js";
import { listLocalizedAudioPaths } from "./audio.js";
import { imagePreprocessAgent } from "./image_agents.js";
import { mkdir } from "../utils/file.js";
import { ZipBuilder } from "../utils/zip.js";
import { bundleTargetLang } from "../utils/const.js";

const beatImage = (context: MulmoStudioContext) => {
  return async (beat: MulmoBeat, index: number) => {
    try {
      const res = await imagePreprocessAgent({ context, beat, index, imageRefs: {} });
      if ("htmlPrompt" in res) {
        return { htmlImageSource: res.htmlImageFile, imageSource: res.imagePath };
      }
      const { imagePath, movieFile, lipSyncFile } = res;
      return { imageSource: imagePath, videoSource: movieFile, videoWithAudioSource: lipSyncFile };
    } catch (e) {
      GraphAILogger.log(e);
      return {};
    }
  };
};

type BundleItem = {
  text?: string;
  multiLinguals?: Record<string, string>;
  audioSources?: Record<string, string>;
  imageSource?: string;
  videoSource?: string;
  videoWithAudioSource?: string;
  htmlImageSource?: string;
};

// TODO reference
const viewJsonFileName = "mulmo_view.json";
const zipFileName = "mulmo.zip";

export const mulmoViewerBundle = async (context: MulmoStudioContext) => {
  const isZip = true;

  const dir = path.resolve(context.fileDirs.fileName);
  mkdir(dir);
  const zipper = new ZipBuilder(path.resolve(dir, zipFileName));

  const resultJson: BundleItem[] = [];
  context.studio.script.beats.forEach((beat) => {
    resultJson.push({ text: beat.text, audioSources: {}, multiLinguals: {} });
  });

  for (const lang of bundleTargetLang) {
    const audios = listLocalizedAudioPaths({ ...context, lang });
    audios.forEach((audio, index) => {
      if (audio) {
        const fileName = path.basename(audio ?? "");
        if (resultJson[index] && resultJson[index].audioSources) {
          resultJson[index].audioSources[lang] = fileName;
        }
        if (fs.existsSync(audio)) {
          fs.copyFileSync(audio, path.resolve(dir, fileName));
          zipper.addFile(audio, fileName);
        }
      }
    });
  }

  const images = await Promise.all(context.studio.script.beats.map(beatImage(context)));
  images.forEach((image, index) => {
    const data = resultJson[index];

    const keys: Exclude<keyof BundleItem, "audioSources">[] = ["htmlImageSource", "imageSource", "videoSource", "videoWithAudioSource"];
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
  });

  context.multiLingual.forEach((beat, index) => {
    bundleTargetLang.forEach((lang) => {
      if (resultJson[index] && resultJson[index].multiLinguals) {
        resultJson[index].multiLinguals[lang] = beat.multiLingualTexts[lang].text;
      }
    });
  });
  
  fs.writeFileSync(path.resolve(dir, viewJsonFileName), JSON.stringify({ beats: resultJson, bgmSource: context.studio?.script.audioParams?.bgm }, null, 2));
  zipper.addFile(path.resolve(dir, viewJsonFileName));
  if (isZip) {
    await zipper.finalize();
  }
};
