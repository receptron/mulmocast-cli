import { Argv } from "yargs";
import { getAvailablePromptTemplates } from "../../../../utils/file.js";

const availableTemplateNames = getAvailablePromptTemplates().map((template) => template.filename);

export const builder = (yargs: Argv) => {
  return yargs
    .option("o", {
      alias: "output",
      description: "Output file path (default: <file>_completed.json)",
      demandOption: false,
      type: "string",
    })
    .option("t", {
      alias: "template",
      description: "Template name to apply",
      demandOption: false,
      choices: availableTemplateNames,
      type: "string",
    })
    .option("s", {
      alias: "style",
      description: "Style name or file path (.json)",
      demandOption: false,
      type: "string",
    })
    .positional("file", {
      description: "Input beats file path (JSON)",
      type: "string",
      demandOption: true,
    });
};
