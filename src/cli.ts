#!/usr/bin/env node

import "dotenv/config";
import path from "path";
import fs from "fs";
import { args } from "./args";

import { createOrUpdateStudioData } from "./utils/preprocess";
import { outDirName } from "./utils/const";
import { MulmoScriptMethods } from "./methods";

import { translate } from "./actions/translate";
import { images } from "./actions/images";
import { audio } from "./actions/audio";
import { movie } from "./actions/movie";

const getBaseDirPath = (basedir?: string) => {
  if (!basedir) {
    return process.cwd();
  }
  if (path.isAbsolute(basedir)) {
    return path.normalize(basedir);
  }
  return path.resolve(process.cwd(), basedir);
};

const getFullPath = (baseDirPath: string, file: string) => {
  if (path.isAbsolute(file)) {
    return path.normalize(file);
  }
  return path.resolve(baseDirPath, file);
};

const main = async () => {
  const { outdir, basedir, file } = args;
  const baseDirPath = getBaseDirPath(basedir as string);
  const mulmoFilePath = getFullPath(baseDirPath, (file as string) ?? "");
  const outDirPath = getFullPath(baseDirPath, (outdir as string) ?? outDirName);

  const files = { baseDirPath, mulmoFilePath, outDirPath };
  if (args.v) {
    console.log(files);
  }

  if (!fs.existsSync(mulmoFilePath)) {
    console.error("File not exists");
    return -1;
  }

  // TODO some option process
  const { action } = args;
  const studio = createOrUpdateStudioData(mulmoFilePath, files);

  if (action === "translate") {
    await translate(studio, files);
  }
  if (action === "audio") {
    await audio(studio, files, MulmoScriptMethods.getSpeechProvider(studio.script) === "nijivoice" ? 1 : 8);
  }
  if (action === "images") {
    await images(studio, files);
  }
  if (action === "movie") {
    await audio(studio, files, MulmoScriptMethods.getSpeechProvider(studio.script) === "nijivoice" ? 1 : 8);
    await images(studio, files);
    await movie(studio, files);
  }
};
main();
