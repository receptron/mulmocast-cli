import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export const args = yargs(hideBin(process.argv))
  .scriptName("mulmocast")
  .option("o", {
    alias: "outdir",
    description: "output dir",
    demandOption: false,
    type: "string",
  })
  .option("scratchpad", {
    description: "scratchpad dir",
    demandOption: false,
    type: "string",
  })
  .option("v", {
    alias: "verbose",
    describe: "verbose log",
    demandOption: true,
    default: false,
    type: "boolean",
  })
  .option("b", {
    alias: "basedir",
    description: "base dir",
    demandOption: false,
    type: "string",
  })
  .option("i", {
    alias: "imagedir",
    description: "image dir",
    demandOption: false,
    type: "string",
  })
  .command("$0 <action> <file>", "Run mulmocast", (yargs) => {
    return yargs
      .positional("action", {
        describe: "action to perform",
        choices: ["translate", "audio", "images", "movie", "preprocess"] as const,
        type: "string",
      })
      .positional("file", {
        describe: "Mulmo Script File",
        type: "string",
      });
  })
  .strict()
  .help()
  .parseSync();
