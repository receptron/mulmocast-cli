import { ToolCliArgs } from "../../../../types/cli_types.js";
import { getBaseDirPath, getFullPath } from "../../../../utils/file.js";
import { outDirName, cacheDirName } from "../../../../types/const.js";
import { getUrlsIfNeeded, selectTemplate } from "../../../../utils/inquirer.js";
import { createMulmoScriptFromUrl, createMulmoScriptFromFile } from "../../../../tools/create_mulmo_script_from_url.js";
import { createMulmoScriptInteractively } from "../../../../tools/create_mulmo_script_interactively.js";
import { setGraphAILogger } from "../../../../cli/helpers.js";
import type { LLM } from "../../../../types/provider2agent.js";

export const handler = async (
  argv: ToolCliArgs<{
    o?: string;
    b?: string;
    u?: string[];
    i?: boolean;
    t?: string;
    "input-file"?: string;
    c?: string;
    s?: string;
    llm?: LLM;
    llm_model?: string;
  }>,
) => {
  const { o: outdir, b: basedir, "input-file": inputFile, v: verbose, i: interactive, c: cache, s: filename, llm, llm_model } = argv;
  let { t: template } = argv;
  const urls = argv.u || [];

  const baseDirPath = getBaseDirPath(basedir as string);
  const outDirPath = getFullPath(baseDirPath, (outdir as string) ?? outDirName);
  const cacheDirPath = getFullPath(outDirPath, (cache as string) ?? cacheDirName);

  if (!template) {
    if (interactive) {
      template = await selectTemplate();
    } else {
      template = "business";
    }
  }

  setGraphAILogger(verbose, {
    baseDirPath,
    outDirPath,
    cacheDirPath,
    template,
    urls,
    interactive,
    filename,
    inputFile,
    llm,
    llm_model,
  });

  const context = { outDirPath, templateName: template, urls, filename: filename as string, cacheDirPath, llm_model, llm, verbose };

  if (interactive) {
    await createMulmoScriptInteractively(context);
    return;
  }
  if (inputFile) {
    await createMulmoScriptFromFile(inputFile, context);
  } else {
    context.urls = await getUrlsIfNeeded(urls);
    await createMulmoScriptFromUrl(context);
  }
};
