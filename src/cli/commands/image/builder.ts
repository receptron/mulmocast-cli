import type { Argv } from "yargs";
import { commonOptions, estimateOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  estimateOptions(commonOptions(yargs)).option("i", {
    alias: "imagedir",
    describe: "Image output directory",
    type: "string",
  });
