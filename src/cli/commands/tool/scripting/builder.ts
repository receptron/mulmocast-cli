import { Argv } from "yargs";
import { llm } from "../../../../types/provider2agent.js";
import { getAvailablePromptTemplates } from "../../../../utils/file.js";

const availableTemplateNames = getAvailablePromptTemplates().map((template) => template.filename);

export const builder = (yargs: Argv) => {
  return yargs
    .option("o", {
      alias: "outdir",
      description: "output dir",
      demandOption: false,
      type: "string",
    })
    .option("b", {
      alias: "basedir",
      description: "base dir",
      demandOption: false,
      type: "string",
    })
    .option("u", {
      alias: "url",
      description: "URLs to reference (required when not in interactive mode)",
      demandOption: false,
      default: [],
      type: "array",
      string: true,
    })
    .option("input-file", {
      description: "input file name",
      demandOption: false,
      type: "string",
    })
    .option("i", {
      alias: "interactive",
      description: "Generate script in interactive mode with user prompts",
      demandOption: false,
      type: "boolean",
    })
    .option("t", {
      alias: "template",
      description: "Template name to use",
      demandOption: false,
      choices: availableTemplateNames,
      type: "string",
    })
    .option("c", {
      alias: "cache",
      description: "cache dir",
      demandOption: false,
      type: "string",
    })
    .option("s", {
      alias: "script",
      description: "script filename",
      demandOption: false,
      default: "script",
      type: "string",
    })
    .option("llm", {
      description: "llm",
      demandOption: false,
      choices: llm,
      type: "string",
    })
    .option("llm_model", {
      description: "llm model",
      demandOption: false,
      type: "string",
    });
};
