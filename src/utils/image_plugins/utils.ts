import { ImageProcessorParams } from "../../types/index.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";
import { randomUUID } from "node:crypto";
import nodeProcess from "node:process";

export const parrotingImagePath = (params: ImageProcessorParams) => {
  return params.imagePath;
};

export const resolveStyle = (styleName: string | undefined, fallbackStyle: string): string => {
  const customStyle = styleName ? getMarkdownStyle(styleName) : undefined;
  return customStyle ? customStyle.css : fallbackStyle;
};

export const generateUniqueId = (prefix: string): string => {
  if (nodeProcess.env.NODE_ENV === "test") {
    return "id";
  }
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};
