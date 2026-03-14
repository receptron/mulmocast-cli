import { processSource, pathSource } from "./source.js";
import { ImageProcessorParams, ImageAnimationPreset } from "../../types/index.js";
import { MulmoMediaSourceMethods } from "../../methods/mulmo_media_source.js";
import { DEFAULT_ANIMATION_FPS, renderAnimatedToVideo } from "./utils.js";

export const imageType = "image";

const generateHtmlBody = (imageDataUrl: string): string => {
  return [
    "<div id='container' class='h-full w-full overflow-hidden relative bg-black'>",
    `  <img id='target' src='${imageDataUrl}' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:none;max-height:none' />`,
    "</div>",
  ].join("\n");
};

const generateScript = (preset: ImageAnimationPreset): string => {
  const easing = preset.easing ?? "easeInOut";

  switch (preset.effect) {
    case "ken_burns": {
      const zoomFrom = preset.zoomFrom ?? 1.0;
      const zoomTo = preset.zoomTo ?? 1.3;
      return `const animation = new MulmoAnimation();
animation.coverZoom('#target', { containerSelector: '#container', zoomFrom: ${zoomFrom}, zoomTo: ${zoomTo}, start: 0, end: 'auto', easing: '${easing}' });`;
    }
    case "pan_horizontal": {
      const from = preset.panFrom ?? 20;
      const to = preset.panTo ?? 80;
      const zoom = preset.zoom ?? 1.2;
      return `const animation = new MulmoAnimation();
animation.coverPan('#target', { containerSelector: '#container', axis: 'x', from: ${from}, to: ${to}, zoom: ${zoom}, start: 0, end: 'auto', easing: '${easing}' });`;
    }
    case "pan_vertical": {
      const from = preset.panFrom ?? 20;
      const to = preset.panTo ?? 80;
      const zoom = preset.zoom ?? 1.2;
      return `const animation = new MulmoAnimation();
animation.coverPan('#target', { containerSelector: '#container', axis: 'y', from: ${from}, to: ${to}, zoom: ${zoom}, start: 0, end: 'auto', easing: '${easing}' });`;
    }
    case "rotate": {
      const from = preset.degreesFrom ?? 0;
      const to = preset.degreesTo ?? 360;
      return `const animation = new MulmoAnimation();
animation.animate('#target', { rotate: [${from}, ${to}], scale: [1.2, 1.2] }, { start: 0, end: 'auto', easing: '${easing}' });`;
    }
    case "flip": {
      return `const animation = new MulmoAnimation();
animation.animate('#target', { rotateY: [0, 180] }, { start: 0, end: 'auto', easing: '${easing}' });`;
    }
    case "fade_in": {
      return `const animation = new MulmoAnimation();
animation.animate('#target', { opacity: [0, 1] }, { start: 0, end: 'auto', easing: '${easing}' });`;
    }
  }
};

const processImageAnimated = async (params: ImageProcessorParams) => {
  const { beat, imagePath, canvasSize, context } = params;
  if (!beat.image || beat.image.type !== imageType || !("animation" in beat.image) || !beat.image.animation) return;

  const preset = beat.image.animation;
  const fps = preset.fps ?? DEFAULT_ANIMATION_FPS;
  const duration = params.beatDuration ?? beat.duration;
  if (duration === undefined) {
    throw new Error("image animation requires beat.duration or audio-derived duration.");
  }

  const imageDataUrl = await MulmoMediaSourceMethods.toDataUrl(beat.image.source, context);
  const scriptCode = generateScript(preset);

  return renderAnimatedToVideo({
    htmlBody: generateHtmlBody(imageDataUrl),
    userScript: `<script>\n${scriptCode}\n</script>`,
    fps,
    duration,
    videoPath: imagePath,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
  });
};

const processImage = async (params: ImageProcessorParams) => {
  const { beat } = params;
  if (beat.image?.type === imageType && "animation" in beat.image && beat.image.animation) {
    return processImageAnimated(params);
  }
  return processSource(imageType)(params);
};

export const process = processImage;
export const path = pathSource(imageType);
