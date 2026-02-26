import type { Argv } from "yargs";
import { languages } from "../types/const.js";

export const commonOptions = (yargs: Argv) => {
  return yargs
    .option("o", {
      alias: "outdir",
      description: "output dir",
      demandOption: false,
      type: "string",
    })
    .option("b", {
      alias: "basedir",
      description: "base dir",
      demandOption: false,
      type: "string",
    })
    .option("l", {
      alias: "lang",
      description: "target language",
      choices: languages,
      demandOption: false,
      type: "string",
    })
    .option("f", {
      alias: "force",
      describe: "Force regenerate",
      type: "boolean",
      default: false,
    })
    .option("g", {
      alias: "grouped",
      describe: "Output all files under output/<basename>/ directory",
      type: "boolean",
      default: false,
    })
    .option("backup", {
      describe: "create backup media file",
      type: "boolean",
      default: false,
    })
    .option("p", {
      alias: "presentationStyle",
      describe: "Presentation Style",
      demandOption: false,
      type: "string",
    })
    .positional("file", {
      describe: "Mulmo Script File",
      type: "string",
    });
};
