import { ImageProcessorParams } from "../../types/index.js";
import { processSource, pathSource } from "./source.js";

export const imageType = "movie";

const dumpHtml = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (!beat.image || beat.image.type !== imageType) return;

  const moviePath = beat.image.source?.path || beat.image.source?.url;
  if (!moviePath) return;

  const title = beat.image.title || "Video";

  return `
<div class="movie-container mb-6">
  <h3 class="text-xl font-semibold mb-4">${title}</h3>
  <div class="relative w-full" style="padding-bottom: 56.25%; /* 16:9 aspect ratio */">
    <video
      class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
      controls
      preload="metadata"
    >
      <source src="${moviePath}" type="video/mp4">
      <source src="${moviePath}" type="video/webm">
      <source src="${moviePath}" type="video/ogg">
      Your browser does not support the video tag.
    </video>
  </div>
</div>`;
};

export const process = processSource(imageType);
export const path = pathSource(imageType);
export const html = dumpHtml;
