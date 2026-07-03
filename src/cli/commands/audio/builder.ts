import type { Argv } from "yargs";
import { commonOptions, estimateOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  estimateOptions(commonOptions(yargs)).option("a", {
    alias: "audiodir",
    describe: "Audio output directory",
    type: "string",
  });
