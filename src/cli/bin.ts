#!/usr/bin/env node

import "dotenv/config";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as translateCmd from "./commands/translate/index.js";
import * as audioCmd from "./commands/audio/index.js";
import * as imagesCmd from "./commands/image/index.js";
import * as movieCmd from "./commands/movie/index.js";
import * as pdfCmd from "./commands/pdf/index.js";
import * as markdownCmd from "./commands/markdown/index.js";
import * as toolCmd from "./commands/tool/index.js";
import { GraphAILogger } from "graphai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));

export const main = async () => {
  const cli = yargs(hideBin(process.argv))
    .scriptName("mulmo")
    .version(packageJson.version)
    .usage("$0 <command> [options]")
    .option("v", {
      alias: "verbose",
      describe: "verbose log",
      demandOption: true,
      default: false,
      type: "boolean",
    })
    .command(translateCmd)
    .command(audioCmd)
    .command(imagesCmd)
    .command(movieCmd)
    .command(pdfCmd)
    .command(markdownCmd)
    .command(toolCmd)
    .demandCommand()
    .strict()
    .help()
    .showHelpOnFail(false)
    .fail((msg, err, y) => {
      // if yargs detect error, show help and exit
      if (msg) {
        y.showHelp();
        GraphAILogger.info("\\n" + msg);
        process.exit(1);
      }
      if (err) {
        throw err;
      }
    })
    .alias("help", "h");

  await cli.parseAsync();
};

main().catch((error) => {
  GraphAILogger.info("An unexpected error occurred:", error);
  process.exit(1);
});
