import type { Argv } from "yargs";
import { commonOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  commonOptions(yargs)
    .option("image_width", {
      describe: "Image width (e.g., 400px, 50%, auto)",
      type: "string",
    });
