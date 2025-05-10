#!/usr/bin/env node

import "dotenv/config";
import { GraphAILogger } from "graphai";

import { args } from "./tool-args.js";
import { outDirName, cacheDirName } from "../utils/const.js";
import { createMulmoScriptFromUrl } from "../tools/create_mulmo_script_from_url.js";
import { getBaseDirPath, getFullPath } from "../utils/file.js";
import { createMulmoScriptInteractively } from "../tools/create_mulmo_script_interactively.js";
import { dumpPromptFromTemplate } from "../tools/dump_prompt.js";
import { getUrlsIfNeeded, selectTemplate } from "../utils/inquirer.js";

const main = async () => {
  const { o: outdir, b: basedir, action, v: verbose, i: interactive, s: filename, cache } = args;
  let { t: template } = args;
  let { u: urls } = args;
  const { llm_model, llm_agent } = args;

  const baseDirPath = getBaseDirPath(basedir as string);
  const outDirPath = getFullPath(baseDirPath, (outdir as string) ?? outDirName);
  const cacheDirPath = getFullPath(outDirPath, (cache as string) ?? cacheDirName);

  if (verbose) {
    GraphAILogger.info("baseDirPath:", baseDirPath);
    GraphAILogger.info("outDirPath:", outDirPath);
    GraphAILogger.info("cacheDirPath:", cacheDirPath);
    GraphAILogger.info("template:", template);
    GraphAILogger.info("urls:", urls);
    GraphAILogger.info("action:", action);
    GraphAILogger.info("interactive:", interactive);
    GraphAILogger.info("filename:", filename);
  } else {
    GraphAILogger.setLevelEnabled("error", false);
    GraphAILogger.setLevelEnabled("log", false);
    GraphAILogger.setLevelEnabled("warn", false);
  }

  // If template is not specified, show the selection prompt
  if (!template) {
    template = await selectTemplate();
    if (verbose) {
      GraphAILogger.info("Selected template:", template);
    }
  }

  if (action === "scripting") {
    const context = { outDirPath, templateName: template, urls, filename, cacheDirPath, llm_model, llm_agent };
    if (interactive) {
      await createMulmoScriptInteractively(context);
    } else {
      context.urls = await getUrlsIfNeeded(urls);
      await createMulmoScriptFromUrl(context);
    }
  } else if (action === "prompt") {
    await dumpPromptFromTemplate({ templateName: template });
  } else {
    throw new Error(`Unknown or unsupported action: ${action}`);
  }
};

main().catch((error) => {
  GraphAILogger.info("An unexpected error occurred:", error);
  process.exit(1);
});
