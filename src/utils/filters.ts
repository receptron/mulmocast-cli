import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import fsPromise from "fs/promises";
import type { AgentFilterFunction } from "graphai";
import { GraphAILogger } from "graphai";
import { writingMessage, isFile } from "./file.js";
import { text2hash } from "./utils_node.js";
import { MulmoStudioContextMethods } from "../methods/mulmo_studio_context.js";
import { replacementsJa, replacePairsJa } from "../utils/string.js";

dotenv.config({ quiet: true });

export const nijovoiceTextAgentFilter: AgentFilterFunction = async (context, next) => {
  const { text, provider, lang } = context.namedInputs;
  if (provider === "nijivoice" && lang === "ja") {
    context.namedInputs.text = replacePairsJa(replacementsJa)(text);
  }
  return next(context);
};

export const fileCacheAgentFilter: AgentFilterFunction = async (context, next) => {
  const { force, file, index, mulmoContext, sessionType, id, withBackup } = context.namedInputs.cache;

  /*
  const fileName = path.resolve(path.dirname(file), id + ".mp3");
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, fileName);
  }
  */

  const shouldUseCache = async () => {
    if (force && force.some((element: boolean | undefined) => element)) {
      return false;
    }
    try {
      await fsPromise.access(file);
      return true;
    } catch {
      return false;
    }
  };

  if (await shouldUseCache()) {
    GraphAILogger.debug(`cache: ${path.basename(file)}`);
    return true;
  }
  const backup = withBackup && withBackup.some((element: boolean | undefined) => element);

  try {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, sessionType, index, id, true);
    const output = ((await next(context)) as { buffer?: Buffer; text?: string; saved?: boolean }) || undefined;
    const { buffer, text, saved } = output ?? {};
    if (saved) {
      return true;
    }
    if (buffer) {
      writingMessage(file);
      await fsPromise.writeFile(file, buffer);
      if (backup) {
        await fsPromise.writeFile(getBackupFilePath(file), buffer);
      }
      return true;
    } else if (text) {
      writingMessage(file);
      await fsPromise.writeFile(file, text, "utf-8");
      if (backup) {
        await fsPromise.writeFile(getBackupFilePath(file), text, "utf-8");
      }
      return true;
    } else if (saved) {
      return true;
    }
    GraphAILogger.log("no cache, no buffer: " + file);
    return false;
  } finally {
    MulmoStudioContextMethods.setBeatSessionState(mulmoContext, sessionType, index, id, false);
  }
};

export const browserlessCacheGenerator = (cacheDir: string) => {
  const browserlessCache: AgentFilterFunction = async (context, next) => {
    const cacheKey = text2hash(context?.namedInputs?.url);
    const cachePath = path.resolve(cacheDir, cacheKey + ".txt");
    if (isFile(cachePath)) {
      // console.log("cache hit!!");
      const text = fs.readFileSync(cachePath, "utf-8");
      return { text };
    }
    // console.log("cache not hit!!");
    const result = (await next(context)) as unknown as { text: string };
    fs.writeFileSync(cachePath, result?.text, "utf8");
    return result;
  };
  return browserlessCache;
};

export const getBackupFilePath = (originalPath: string): string => {
  const { dir, name, ext } = path.parse(originalPath);

  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return path.join(dir, `${name}-${ts}${ext}`);
};
