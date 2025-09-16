import { ImageProcessorParams } from "../../types/index.js";
import { processSource, pathSource } from "./source.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";

export const imageType = "movie";

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat, context } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const moviePathOrUrl = MulmoMediaSourceMethods.resolve(beat.image.source, context);

  if (!moviePathOrUrl) return;

  return `
<div class="movie-container mb-6">
  <div class="relative w-full" style="padding-bottom: 56.25%; /* 16:9 aspect ratio */">
    <video
      class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
      controls
      preload="metadata"
    >
      <source src="${moviePathOrUrl}" type="video/mp4">
      <source src="${moviePathOrUrl}" type="video/webm">
      <source src="${moviePathOrUrl}" type="video/ogg">
      Your browser does not support the video tag.
    </video>
  </div>
</div>`;
};

export const process = processSource(imageType);
export const path = pathSource(imageType);
export const html = dumpHtml;
