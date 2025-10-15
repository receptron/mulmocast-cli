import type { Argv } from "yargs";
import { commonOptions } from "../../common.js";

export const builder = (yargs: Argv) =>
  // zip
  commonOptions(yargs);
