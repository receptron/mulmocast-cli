import fs from "fs";
import { MulmoMediaSource, MulmoStudioContext } from "../types/index.js";
import { getFullPath, resolveAssetPath } from "../utils/file.js";

export const MulmoMediaSourceMethods = {
  async getText(mediaSource: MulmoMediaSource, context: MulmoStudioContext) {
    if (mediaSource.kind === "text") {
      return mediaSource.text;
    }
    if (mediaSource.kind === "url") {
      const res = await fetch(mediaSource.url);
      if (!res.ok) {
        throw new Error(`Failed to fetch media source: ${mediaSource.url}`);
      }
      return await res.text();
    }
    if (mediaSource.kind === "path") {
      const path = getFullPath(context.fileDirs.mulmoFileDirPath, mediaSource.path);
      return fs.readFileSync(path, "utf-8");
    }
    return null;
  },
  resolve(mediaSource: MulmoMediaSource | undefined, context: MulmoStudioContext) {
    if (!mediaSource) return null;
    if (mediaSource.kind === "path") {
      return resolveAssetPath(context, mediaSource.path);
    }
    if (mediaSource.kind === "url") {
      return mediaSource.url;
    }
    return null;
  },
};
