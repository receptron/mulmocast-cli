import path from "path";
import fs from "fs";
import { GraphAILogger } from "graphai";
import { type MulmoStudioContext, type MulmoStudioBeat, type MulmoViewerBeat, type MulmoViewerData, type MulmoMediaSource } from "../types/index.js";
import { listLocalizedAudioPaths } from "./audio.js";
import { mkdir } from "../utils/file.js";
import { ZipBuilder } from "../utils/zip.js";
import { bundleTargetLang } from "../types/const.js";
import { createSilentAudio } from "../utils/ffmpeg_utils.js";
import { silentMp3 } from "../utils/context.js";

const downloadFile = async (url: string, destPath: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
};

const processBgm = async (bgm: MulmoMediaSource | undefined, outDir: string, baseDir: string, zipper: ZipBuilder | undefined): Promise<string | undefined> => {
  if (!bgm) {
    return undefined;
  }

  if (bgm.kind === "path") {
    // Local file path
    const sourcePath = path.resolve(baseDir, bgm.path);
    if (!fs.existsSync(sourcePath)) {
      GraphAILogger.log(`BGM file not found: ${sourcePath}`);
      return undefined;
    }
    const fileName = path.basename(bgm.path);
    if (zipper) {
      zipper.addFile(sourcePath, fileName);
    } else {
      fs.copyFileSync(sourcePath, path.resolve(outDir, fileName));
    }
    return fileName;
  } else if (bgm.kind === "url") {
    // URL download
    const fileName = path.basename(new URL(bgm.url).pathname) || "bgm.mp3";
    const destPath = path.resolve(outDir, fileName);
    await downloadFile(bgm.url, destPath);
    zipper?.addFile(destPath);
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

export type MulmoViewerBundleOptions = {
  skipZip?: boolean;
};

export const mulmoViewerBundle = async (context: MulmoStudioContext, options: MulmoViewerBundleOptions = {}) => {
  const { skipZip = false } = options;

  const outDir = context.fileDirs.outDirPath;
  const baseDir = context.fileDirs.baseDirPath;
  const filename = context.studio.filename;
  mkdir(outDir);

  // Bundle directory: when grouped, outDir is already output/<script_name>/
  const bundleDir = context.fileDirs.grouped ? outDir : path.resolve(outDir, filename);
  mkdir(bundleDir);

  const zipper = skipZip ? undefined : new ZipBuilder(path.resolve(bundleDir, zipFileName));

  // text
  const resultJson: MulmoViewerBeat[] = [];
  context.studio.script.beats.forEach((beat, index) => {
    const sudioBeats = context.studio.beats[index];
    const { duration, startAt } = sudioBeats;
    // console.log(context.studio.beats[index]);
    resultJson.push({
      id: beat.id,
      text: beat.text,
      duration,
      startTime: startAt,
      endTime: (startAt ?? 0) + (duration ?? 0),
      audioSources: {},
      multiLinguals: {},
    });
  });

  // audio
  for (const lang of bundleTargetLang) {
    const audios = listLocalizedAudioPaths({ ...context, lang });
    await Promise.all(
      audios.map(async (audio, index) => {
        if (audio) {
          const fileName = path.basename(audio ?? "");
          if (resultJson[index] && resultJson[index].audioSources) {
            resultJson[index].audioSources[lang] = fileName;
          }

          if (fileName === "silent300.mp3") {
            // Download from GitHub URL
            const destPath = path.resolve(bundleDir, fileName);
            await downloadFile(silentMp3, destPath);
            zipper?.addFile(destPath, fileName);
          } else if (fs.existsSync(audio)) {
            if (zipper) {
              zipper.addFile(audio, fileName);
            } else {
              fs.copyFileSync(audio, path.resolve(bundleDir, fileName));
            }
          }
        }
      }),
    );
  }

  // image, movie
  context.studio.beats.forEach((image, index) => {
    const data = resultJson[index];
    imageSourceMappings.forEach(([key, source]) => {
      const value = image[key];
      if (typeof value === "string") {
        (data[source] as string) = path.basename(value);
        if (fs.existsSync(value)) {
          if (zipper) {
            zipper.addFile(value);
          } else {
            fs.copyFileSync(value, path.resolve(bundleDir, path.basename(value)));
          }
        }
      }
    });
  });

  // silent - generated files always go to bundleDir
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
        const audioFile = path.resolve(bundleDir, file);
        await createSilentAudio(audioFile, data.duration);
        zipper?.addFile(audioFile);
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
  const bgmFileName = await processBgm(context.studio?.script.audioParams?.bgm, bundleDir, baseDir, zipper);

  const bundleData: MulmoViewerData = { beats: resultJson, bgmSource: bgmFileName, title: context.studio.script.title };
  const viewJsonPath = path.resolve(bundleDir, viewJsonFileName);
  fs.writeFileSync(viewJsonPath, JSON.stringify(bundleData, null, 2));
  zipper?.addFile(viewJsonPath);
  if (zipper) {
    await zipper.finalize();
  }
};
