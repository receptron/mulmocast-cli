import fs from "fs";
import { GraphAILogger } from "graphai";
import type { MulmoMediaSource, MulmoMediaMermaidSource, MulmoStudioContext, ImageType } from "../types/index.js";
import { getFullPath, getReferenceImagePath, resolveAssetPath } from "../utils/file.js";
import { getExtention } from "../utils/utils.js";

// for image reference
const downLoadReferenceImage = async (context: MulmoStudioContext, key: string, url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // Detect file extension from Content-Type header or URL
  const extension = getExtention(response.headers.get("content-type"), url);
  const imagePath = getReferenceImagePath(context, key, extension);
  await fs.promises.writeFile(imagePath, buffer);
  return imagePath;
};

// for image
function pluginSourceFixExtention(path: string, imageType: ImageType) {
  if (imageType === "movie") {
    return path.replace(/\.png$/, ".mov");
  }
  return path;
}

export const MulmoMediaSourceMethods = {
  async getText(mediaSource: MulmoMediaMermaidSource, context: MulmoStudioContext) {
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
  // if url then download image and save it to file. both case return local image path. For image reference
  async imageReference(mediaSource: MulmoMediaSource, context: MulmoStudioContext, key: string) {
    if (mediaSource.kind === "path") {
      return resolveAssetPath(context, mediaSource.path);
    } else if (mediaSource.kind === "url") {
      return await downLoadReferenceImage(context, key, mediaSource.url);
    }
    // TODO base64
    throw new Error(`imageReference media unknown error`); // TODO cause
  },

  async imagePluginSource(mediaSource: MulmoMediaSource, context: MulmoStudioContext, expectImagePath: string, imageType: ImageType) {
    if (mediaSource.kind === "url") {
      const response = await fetch(mediaSource.url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${mediaSource.url}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      // Detect file extension from Content-Type header or URL
      const imagePath = pluginSourceFixExtention(expectImagePath, imageType);
      await fs.promises.writeFile(imagePath, buffer);
      return imagePath;
    }
    const path = MulmoMediaSourceMethods.resolve(mediaSource, context);
    if (path) {
      return path;
    }
    // base64??

    GraphAILogger.error(`Image Plugin unknown ${imageType} source type:`, mediaSource);
    throw new Error(`ERROR: unknown ${imageType} source type`); // TODO cause
  },
  imagePluginSourcePath(mediaSource: MulmoMediaSource, context: MulmoStudioContext, expectImagePath: string, imageType: ImageType) {
    if (mediaSource?.kind === "url") {
      return pluginSourceFixExtention(expectImagePath, imageType);
    }
    const path = MulmoMediaSourceMethods.resolve(mediaSource, context);
    if (path) {
      return path;
    }
    return undefined;
  },
};
