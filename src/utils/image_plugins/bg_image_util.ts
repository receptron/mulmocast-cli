import { BackgroundImage, MulmoStudioContext } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";

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
export const backgroundImageToCSS = async (backgroundImage: BackgroundImage | undefined, context: MulmoStudioContext): Promise<string> => {
  if (!backgroundImage) {
    return "";
  }

  const isSimpleUrl = typeof backgroundImage === "string";
  const imageUrl = isSimpleUrl ? await fetchUrlAsDataUrl(backgroundImage) : await MulmoMediaSourceMethods.toDataUrl(backgroundImage.source, context);
  const size = isSimpleUrl ? "cover" : (backgroundImage.size ?? "cover");
  const position = isSimpleUrl ? "center" : (backgroundImage.position ?? "center");
  const opacity = isSimpleUrl ? 1 : (backgroundImage.opacity ?? 1);

  // Use pseudo-element for opacity to not affect content
  if (opacity < 1) {
    return `
      body {
        position: relative;
      }
      body::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('${imageUrl}');
        background-size: ${size};
        background-position: ${position};
        background-repeat: no-repeat;
        opacity: ${opacity};
        z-index: -1;
      }
    `;
  }

  return `
    body {
      background-image: url('${imageUrl}');
      background-size: ${size};
      background-position: ${position};
      background-repeat: no-repeat;
    }
  `;
};
