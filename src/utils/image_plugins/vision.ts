import { ImageProcessorParams } from "../../types/index.js";
import { parrotingImagePath } from "./utils.js";
import { htmlPlugin } from "mulmocast-vision";
import { resolve as resolvePath } from "path";

export const imageType = "vision";

const toCreateName = (str: string): string => {
  return "create" + str.charAt(0).toUpperCase() + str.slice(1);
};

const processVision = async (params: ImageProcessorParams) => {
  const { beat, imagePath, context } = params;

  const rootDir = context.fileDirs.nodeModuleRootPath ? resolvePath(context.fileDirs.nodeModuleRootPath, "mulmocast-vision") : undefined;
  if (!beat?.image || beat.image.type !== imageType) return;

  const handler = new htmlPlugin({ rootDir });

  await handler[toCreateName(beat.image.style) as keyof htmlPlugin](beat.image.data, {
    name: beat.image.style,
    imageFilePath: imagePath,
    htmlFilePath: imagePath.replace(/\.png$/, ".html"),
  });

  return imagePath;
};

export const process = processVision;
export const path = parrotingImagePath;
