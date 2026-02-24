import { Argv } from "yargs";

export const builder = (yargs: Argv) =>
  yargs
    .positional("category", {
      describe: "Category to show info for",
      type: "string",
      choices: ["styles", "bgm", "templates", "voices", "images", "movies", "llm", "themes", "rc"],
    })
    .option("format", {
      alias: "F",
      describe: "Output format",
      type: "string",
      choices: ["text", "json", "yaml"],
      default: "text",
    });
