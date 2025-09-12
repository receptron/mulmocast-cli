import { ImageProcessorParams } from "../../types/index.js";
import type { MulmoBeat } from "../../types/index.js";

export const parrotingImagePath = (params: ImageProcessorParams) => {
  return params.imagePath;
};

export const isVaidBeat = <T>(beat: MulmoBeat, imageType: string): beat is MulmoBeat & { image: T } => {
  return beat.image !== undefined && beat.image.type === imageType;
};
