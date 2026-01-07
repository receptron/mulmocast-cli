import { Argv } from "yargs";
import { getAvailablePromptTemplates } from "../../../../utils/file.js";
import { llm } from "../../../../types/provider2agent.js";
import { storyToScriptGenerateMode } from "../../../../types/const.js";

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
    .option("t", {
      alias: "template",
      description: "Template name to use",
      demandOption: false,
      choices: availableTemplateNames,
      type: "string",
    })
    .option("s", {
      alias: "script",
      description: "script filename",
      demandOption: false,
      default: "script",
      type: "string",
    })
    .option("beats_per_scene", {
      description: "beats per scene",
      demandOption: false,
      default: 3,
      type: "number",
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
    })
    .option("mode", {
      description: "story to script generation mode",
      demandOption: false,
      choices: Object.values(storyToScriptGenerateMode),
      default: storyToScriptGenerateMode.stepWise,
      type: "string",
    })
    .positional("file", {
      description: "story file path",
      type: "string",
    });
};
