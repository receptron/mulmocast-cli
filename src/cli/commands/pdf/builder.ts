import type { Argv } from "yargs";
import { commonOptions, estimateOptions } from "../../common.js";
import { pdf_modes, pdf_sizes } from "../../../types/const.js";

export const builder = (yargs: Argv) =>
  estimateOptions(commonOptions(yargs))
    .option("i", {
      alias: "imagedir",
      describe: "Image output directory",
      type: "string",
    })
    .option("pdf_mode", {
      describe: "PDF mode",
      choices: pdf_modes,
      type: "string",
      default: "slide",
    })
    .option("pdf_size", {
      describe: "PDF paper size (default: letter)",
      choices: pdf_sizes,
      default: "letter",
    });
