import { BackgroundImage, MulmoStudioContext, ImageProcessorParams } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";
import { resolveStyle } from "./utils.js";

const DEFAULT_FETCH_TIMEOUT_MS = 30000;

/**
 * Resolve background image from beat level and global level settings.
 * Beat level takes precedence over global level.
 * null explicitly disables background image.
 */
export const resolveBackgroundImage = (
  beatBackgroundImage: BackgroundImage | undefined,
  globalBackgroundImage: BackgroundImage | undefined,
): BackgroundImage | undefined => {
  // null means explicitly disabled
  if (beatBackgroundImage === null) {
    return undefined;
  }
  // Beat level takes precedence
  if (beatBackgroundImage !== undefined) {
    return beatBackgroundImage;
  }
  // Fall back to global
  if (globalBackgroundImage === null) {
    return undefined;
  }
  return globalBackgroundImage;
};

/**
 * Fetch URL and convert to data URL with timeout
 */
const fetchUrlAsDataUrl = async (url: string, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch background image: ${url} (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Fetch timeout for background image: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Convert BackgroundImage to CSS string
 */
// Convert size option to CSS background-size value
const sizeToCSS = (size: string): string => {
  return size === "fill" ? "100% 100%" : size;
};

/**
 * Resolve combined style from background image and custom style.
 * Common pattern used by markdown, textSlide, mermaid plugins.
 */
export const resolveCombinedStyle = async (
  params: ImageProcessorParams,
  beatBackgroundImage: BackgroundImage | undefined,
  beatStyle: string | undefined,
): Promise<string> => {
  const { context, textSlideStyle } = params;
  const globalBackgroundImage = context.studio.script.imageParams?.backgroundImage;
  const resolvedBackgroundImage = resolveBackgroundImage(beatBackgroundImage, globalBackgroundImage);
  const backgroundCSS = await backgroundImageToCSS(resolvedBackgroundImage, context);
  const style = resolveStyle(beatStyle, textSlideStyle);
  return backgroundCSS + style;
};

export const backgroundImageToCSS = async (backgroundImage: BackgroundImage | undefined, context: MulmoStudioContext): Promise<string> => {
  if (!backgroundImage) {
    return "";
  }

  const isSimpleUrl = typeof backgroundImage === "string";
  const imageUrl = isSimpleUrl ? await fetchUrlAsDataUrl(backgroundImage) : await MulmoMediaSourceMethods.toDataUrl(backgroundImage.source, context);
  const size = sizeToCSS(isSimpleUrl ? "cover" : (backgroundImage.size ?? "cover"));
  const opacity = isSimpleUrl ? 1 : (backgroundImage.opacity ?? 1);

  // Use pseudo-element for opacity to not affect content
  if (opacity < 1) {
    return `
      html, body {
        height: 100%;
        margin: 0;
      }
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('${imageUrl}');
        background-size: ${size};
        background-position: center;
        background-repeat: no-repeat;
        opacity: ${opacity};
        z-index: -1;
      }
    `;
  }

  return `
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      background-image: url('${imageUrl}');
      background-size: ${size};
      background-position: center;
      background-repeat: no-repeat;
    }
  `;
};
