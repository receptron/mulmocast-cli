import { ToolCliArgs } from "../../../../types/cli_types.js";
import { selectTemplate } from "../../../../utils/inquirer.js";
import { setGraphAILogger } from "../../../../cli/helpers.js";
import { storyToScript } from "../../../../tools/story_to_script.js";
import { mulmoStoryboardSchema } from "../../../../types/schema.js";
import { getBaseDirPath, getFullPath, readAndParseJson } from "../../../../utils/file.js";
import { outDirName } from "../../../../types/const.js";
import type { LLM } from "../../../../types/provider2agent.js";
import { StoryToScriptGenerateMode } from "../../../../types/type.js";

export const handler = async (
  argv: ToolCliArgs<{
    o?: string;
    b?: string;
    t?: string;
    s?: string;
    beats_per_scene?: number;
    file?: string;
    llm?: LLM;
    llm_model?: string;
    mode?: string;
  }>,
) => {
  const { v: verbose, s: filename, file, o: outdir, b: basedir, beats_per_scene, llm, llm_model, mode } = argv;
  let { t: template } = argv;

  const baseDirPath = getBaseDirPath(basedir as string);
  const outDirPath = getFullPath(baseDirPath, (outdir as string) ?? outDirName);

  if (!template) {
    template = await selectTemplate();
  }

  setGraphAILogger(verbose, {
    outdir: outDirPath,
    basedir: baseDirPath,
    template,
    fileName: filename as string,
    beatsPerScene: beats_per_scene as number,
    storyFilePath: file as string,
    llmAgent: llm,
    llmModel: llm_model,
  });

  const parsedStory = readAndParseJson(file as string, mulmoStoryboardSchema);
  await storyToScript({
    story: parsedStory,
    beatsPerScene: beats_per_scene as number,
    templateName: template,
    outdir: outDirPath,
    fileName: filename as string,
    llm,
    llmModel: llm_model,
    generateMode: mode as StoryToScriptGenerateMode,
  });
};
