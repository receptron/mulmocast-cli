import { ImageProcessorParams } from "../../types/index.js";
import { getMarkdownStyle } from "../../data/markdownStyles.js";

export const parrotingImagePath = (params: ImageProcessorParams) => {
  return params.imagePath;
};

export const resolveStyle = (styleName: string | undefined, fallbackStyle: string): string => {
  const customStyle = styleName ? getMarkdownStyle(styleName) : undefined;
  return customStyle ? customStyle.css : fallbackStyle;
};
