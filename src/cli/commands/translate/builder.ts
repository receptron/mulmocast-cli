import type { Argv } from "yargs";
import { commonOptions, estimateOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  estimateOptions(commonOptions(yargs)).positional("file", {
    describe: "Mulmo Script File",
    type: "string",
  });
