import fs from "fs";
import { GraphAILogger, assert } from "graphai";
import type { MulmoMediaSource, MulmoMediaMermaidSource, MulmoStudioContext, ImageType } from "../types/index.js";
import { getFullPath, getReferenceImagePath, resolveAssetPath } from "../utils/file.js";
import { downLoadReferenceImageError, getTextError } from "../utils/error_cause.js";

// for image reference
export const getExtention = (contentType: string | null, url: string) => {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "jpg";
  } else if (contentType?.includes("png")) {
    return "png";
  }
  // Fall back to URL extension
  const urlExtension = url.split(".").pop()?.toLowerCase();
  if (urlExtension && ["jpg", "jpeg", "png"].includes(urlExtension)) {
    return urlExtension === "jpeg" ? "jpg" : urlExtension;
  }
  return "png"; // default
};

const downLoadReferenceImage = async (context: MulmoStudioContext, key: string, url: string) => {
  const response = await fetch(url);

  assert(response.ok, `Failed to download reference image: ${url}`, false, downLoadReferenceImageError(key, url));
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

// end of util

export const MulmoMediaSourceMethods = {
  async getText(mediaSource: MulmoMediaMermaidSource, context: MulmoStudioContext) {
    if (mediaSource.kind === "text") {
      return mediaSource.text;
    }
    if (mediaSource.kind === "url") {
      const response = await fetch(mediaSource.url);
      assert(response.ok, `Failed to download mermaid code text: ${mediaSource.url}`, false, getTextError(mediaSource.url));
      return await response.text();
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
    throw new Error(`imageReference media unknown error`, { cause: imageReferenceUnknownMediaError(key) });
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
