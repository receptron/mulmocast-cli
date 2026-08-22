import { ImageProcessorParams } from "../../types/index.js";
import { processSource, pathSource } from "./source.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";
import { movieHtml } from "./media_html.js";

export const imageType = "movie";

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const moviePathOrUrl = MulmoMediaSourceMethods.resolve(beat.image.source, context);

  if (!moviePathOrUrl) return;

  return movieHtml(moviePathOrUrl);
};

export const process = processSource(imageType);
export const path = pathSource(imageType);
export const html = dumpHtml;
