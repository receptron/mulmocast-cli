import { GraphAILogger } from "graphai";
import { ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";

type ImageType = "image" | "movie";

export const processSource = (imageType: ImageType) => {
  return (params: ImageProcessorParams) => {
    const { beat, context } = params;
    if (!beat?.image || beat.image.type !== imageType) return;

    const path = MulmoMediaSourceMethods.resolve(beat.image.source, context);
    if (path) {
      return path;
    }
    GraphAILogger.error(`Image Plugin unknown ${imageType} source type:`, beat.image);
    throw new Error(`ERROR: unknown ${imageType} source type`);
  };
};
