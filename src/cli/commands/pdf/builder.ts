import type { Argv } from "yargs";
import { commonOptions } from "../../common.js";
import { pdf_modes, pdf_sizes } from "../../../utils/const.js";

export const builder = (yargs: Argv) =>
  commonOptions(yargs)
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
    })
    .option("pdf_engine", {
      describe: "PDF generation engine",
      choices: ["pdf-lib", "puppeteer"],
      type: "string",
      default: "pdf-lib",
    });
