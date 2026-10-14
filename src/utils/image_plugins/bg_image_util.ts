import { BackgroundImage, MulmoStudioContext, ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";
import { resolveStyle } from "./utils.js";
import { safeFetch, DEFAULT_FETCH_TIMEOUT_MS } from "../fetch.js";
import { neutralizeStyleTerminator } from "../html_escape.js";
import { backgroundImageCss, backgroundImageLayout, resolveBackgroundImage } from "./bg_image_css.js";

/**
 * Fetch URL and convert to data URL with timeout
 */
const fetchUrlAsDataUrl = async (url: string, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<string> => {
  const response = await safeFetch(url, {}, timeoutMs);
  if (!response.ok) {
    throw new Error(`Failed to fetch background image: ${url} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
};

/** The background image comes from the script, the style from the beat; the paths and sizes `process()` needs are not read here. */
type CombinedStyleParams = Pick<ImageProcessorParams, "context" | "textSlideStyle">;

/**
 * Resolve combined style from background image and custom style.
 * Common pattern used by markdown, textSlide, mermaid plugins.
 */
export const resolveCombinedStyle = async (
  params: CombinedStyleParams,
  beatBackgroundImage: BackgroundImage | undefined,
  beatStyle: string | undefined,
): Promise<string> => {
  const { context, textSlideStyle } = params;
  const globalBackgroundImage = context.studio.script.imageParams?.backgroundImage;
  const resolvedBackgroundImage = resolveBackgroundImage(beatBackgroundImage, globalBackgroundImage);
  const backgroundCSS = await backgroundImageToCSS(resolvedBackgroundImage, context);
  const style = resolveStyle(beatStyle, textSlideStyle);
  return neutralizeStyleTerminator(backgroundCSS + style);
};

export const backgroundImageToCSS = async (backgroundImage: BackgroundImage | undefined, context: MulmoStudioContext): Promise<string> => {
  if (!backgroundImage) {
    return "";
  }

  // Escaped where it is written (backgroundImageCss) rather than here: the base64 body cannot carry a quote, but
  // the content-type in front of it is whatever the remote server's response header said.
  const imageUrl =
    typeof backgroundImage === "string" ? await fetchUrlAsDataUrl(backgroundImage) : await MulmoMediaSourceMethods.toDataUrl(backgroundImage.source, context);
  const { size, opacity } = backgroundImageLayout(backgroundImage);
  return backgroundImageCss(imageUrl, size, opacity);
};
