import type { Argv } from "yargs";
import { commonOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  commonOptions(yargs).option("i", {
    alias: "imagedir",
    describe: "Image output directory",
    type: "string",
  });
