import { BeatRenderParams, ImageProcessorParams } from "../../types/index.js";
import { parrotingImagePath } from "./utils.js";
import { htmlPlugin, templateNameTofunctionName } from "mulmocast-vision";
import { resolve as resolvePath } from "path";
import { agentGenerationError, imageAction, unsupportedImageTypeTarget } from "../error_cause.js";
export const imageType = "vision";

const processVision = async (params: ImageProcessorParams) => {
  const { beat, imagePath, context } = params;

  const rootDir = context.fileDirs.nodeModuleRootPath ? resolvePath(context.fileDirs.nodeModuleRootPath, "mulmocast-vision") : undefined;
  if (!beat?.image || beat.image.type !== imageType) return;
  // mulmocast-vision launches its own browser, which the strict network guard cannot reach.
  if (context.strictNetwork) {
    throw new Error("vision beats cannot be rendered with --strict-network: mulmocast-vision renders in its own browser, outside the network guard", {
      cause: agentGenerationError("visionPlugin", imageAction, unsupportedImageTypeTarget),
    });
  }

  const handler = new htmlPlugin({ rootDir });

  await handler.callNamedFunction(templateNameTofunctionName(beat.image.style) as keyof htmlPlugin, beat.image.data, {
    functionName: beat.image.style,
    imageFilePath: imagePath,
    htmlFilePath: imagePath.replace(/\.png$/, ".html"),
  });

  return imagePath;
};

const dumpHtml = async (params: BeatRenderParams) => {
  const { beat, context } = params;

  const rootDir = context.fileDirs.nodeModuleRootPath ? resolvePath(context.fileDirs.nodeModuleRootPath, "mulmocast-vision") : undefined;

  if (!beat.image || beat.image.type !== imageType) return;

  const handler = new htmlPlugin({ rootDir });
  return handler.getHtml(templateNameTofunctionName(beat.image.style) as keyof htmlPlugin, beat.image.data);
};

export const process = processVision;
export const path = parrotingImagePath;

export const html = dumpHtml;
