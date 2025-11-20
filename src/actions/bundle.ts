import path from "path";
import fs from "fs";
import { GraphAILogger } from "graphai";
import { type MulmoStudioContext, type MulmoStudioBeat, type MulmoViewerBeat, type MulmoViewerData, type MulmoMediaSource } from "../types/index.js";
import { listLocalizedAudioPaths } from "./audio.js";
import { mkdir } from "../utils/file.js";
import { ZipBuilder } from "../utils/zip.js";
import { bundleTargetLang } from "../utils/const.js";
import { createSilentAudio } from "../utils/ffmpeg_utils.js";

const downloadFile = async (url: string, destPath: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
};

const processBgm = async (bgm: MulmoMediaSource | undefined, dir: string, zipper: ZipBuilder): Promise<string | undefined> => {
  if (!bgm) {
    return undefined;
  }

  if (bgm.kind === "path") {
    // Local file path
    const sourcePath = path.resolve(bgm.path);
    if (!fs.existsSync(sourcePath)) {
      GraphAILogger.log(`BGM file not found: ${sourcePath}`);
      return undefined;
    }
    const fileName = path.basename(bgm.path);
    const destPath = path.resolve(dir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    zipper.addFile(sourcePath, fileName);
    return fileName;
  } else if (bgm.kind === "url") {
    // URL download
    const fileName = path.basename(new URL(bgm.url).pathname) || "bgm.mp3";
    const destPath = path.resolve(dir, fileName);
    await downloadFile(bgm.url, destPath);
    zipper.addFile(destPath);
    return fileName;
  }

  // base64 or other formats are not supported
  return undefined;
};

const viewJsonFileName = "mulmo_view.json";
const zipFileName = "mulmo.zip";

type ImageSourceMapping = readonly [keyof MulmoStudioBeat, keyof MulmoViewerBeat][];
const imageSourceMappings: ImageSourceMapping = [
  ["imageFile", "imageSource"],
  ["movieFile", "videoSource"],
  ["soundEffectFile", "soundEffectSource"],
  ["lipSyncFile", "videoWithAudioSource"],
  ["htmlImageFile", "htmlImageSource"],
];

export const mulmoViewerBundle = async (context: MulmoStudioContext) => {
  const isZip = true;

  const dir = path.resolve(context.fileDirs.fileName);
  mkdir(dir);
  const zipper = new ZipBuilder(path.resolve(dir, zipFileName));

  // text
  const resultJson: MulmoViewerBeat[] = [];
  context.studio.script.beats.forEach((beat, index) => {
    const sudioBeats = context.studio.beats[index];
    const { duration, startAt } = sudioBeats;
    // console.log(context.studio.beats[index]);
    resultJson.push({ text: beat.text, duration, startTime: startAt, endTime: startAt + duration, audioSources: {}, multiLinguals: {} });
  });

  // audio
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

  // image, movie
  context.studio.beats.forEach((image, index) => {
    const data = resultJson[index];
    imageSourceMappings.forEach(([key, source]) => {
      const value = image[key];
      if (typeof value === "string") {
        (data[source] as string) = path.basename(value);
        if (fs.existsSync(value)) {
          fs.copyFileSync(value, path.resolve(dir, path.basename(value)));
          zipper.addFile(value);
        }
      }
    });
  });

  // silent
  await Promise.all(
    context.studio.script.beats.map(async (__, index) => {
      const data = resultJson[index];
      if (
        data.audioSources &&
        Object.keys(data.audioSources).length === 0 &&
        data.videoSource === undefined &&
        data.videoWithAudioSource === undefined &&
        data.duration
      ) {
        const file = `silent_${index}.mp3`;
        const audioFile = path.resolve(dir, file);
        await createSilentAudio(audioFile, data.duration);
        zipper.addFile(audioFile);
        data.audioSources.ja = file;
        data.audioSources.en = file;
      }
    }),
  );

  // multiLinguals
  context.multiLingual.forEach((beat, index) => {
    bundleTargetLang.forEach((lang) => {
      if (resultJson[index] && resultJson[index].multiLinguals) {
        resultJson[index].multiLinguals[lang] = beat.multiLingualTexts[lang].text;
      }
    });
  });

  // BGM
  const bgmFileName = await processBgm(context.studio?.script.audioParams?.bgm, dir, zipper);

  const bundleData: MulmoViewerData = { beats: resultJson, bgmSource: bgmFileName };
  fs.writeFileSync(path.resolve(dir, viewJsonFileName), JSON.stringify(bundleData, null, 2));
  zipper.addFile(path.resolve(dir, viewJsonFileName));
  if (isZip) {
    await zipper.finalize();
  }
};
