import type { Argv } from "yargs";
import { commonOptions } from "../../common.js";
import { languages } from "../../../types/const.js";

export const builder = (yargs: Argv) =>
  commonOptions(yargs)
    .option("a", {
      alias: "audiodir",
      describe: "Audio output directory",
      type: "string",
    })
    .option("i", {
      alias: "imagedir",
      describe: "Image output directory",
      type: "string",
    })
    .option("c", {
      alias: "caption",
      describe: "Video captions",
      choices: languages,
      type: "string",
    });
