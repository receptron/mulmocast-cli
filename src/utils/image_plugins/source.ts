import { type ImageProcessorParams, type ImageType } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";

export const processSource = (imageType: ImageType) => {
  return async (params: ImageProcessorParams) => {
    const { beat, context } = params;
    if (!beat?.image || beat.image.type !== imageType) return;

    return MulmoMediaSourceMethods.imagePluginSource(beat.image.source, context, params.imagePath, imageType);
  };
};

export const pathSource = (imageType: ImageType) => {
  return (params: ImageProcessorParams) => {
    const { beat, context } = params;
    if (!beat?.image || beat.image.type !== imageType) return;
    if (beat.image?.type == "image" || beat.image?.type == "movie") {
      return MulmoMediaSourceMethods.imagePluginSourcePath(beat.image.source, context, params.imagePath, imageType);
    }
  };
};
