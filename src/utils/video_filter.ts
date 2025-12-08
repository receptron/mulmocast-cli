import { MulmoVideoFilter } from "../types/index.js";

// Helper functions for different filter categories
const convertColorFilter = (filter: MulmoVideoFilter): string | null => {
  switch (filter.type) {
    case "mono":
      return "hue=s=0";
    case "sepia":
      return "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131";
    case "brightness_contrast":
      return `eq=brightness=${filter.brightness}:contrast=${filter.contrast}`;
    case "hue": {
      const parts = [`h=${filter.hue ?? 0}`, `s=${filter.saturation ?? 1}`, `b=${filter.brightness ?? 0}`];
      return `hue=${parts.join(":")}`;
    }
    case "colorbalance":
      return `colorbalance=rs=${filter.rs}:gs=${filter.gs}:bs=${filter.bs}:rm=${filter.rm}:gm=${filter.gm}:bm=${filter.bm}:rh=${filter.rh}:gh=${filter.gh}:bh=${filter.bh}`;
    case "vibrance":
      return `vibrance=intensity=${filter.intensity}`;
    case "negate":
      return `negate${filter.negate_alpha ? "=negate_alpha=1" : ""}`;
    case "colorhold":
      return `colorhold=color=${filter.color}:similarity=${filter.similarity}:blend=${filter.blend}`;
    case "colorkey":
      return `colorkey=color=${filter.color}:similarity=${filter.similarity}:blend=${filter.blend}`;
    default:
      return null;
  }
};

const convertBlurSharpenFilter = (filter: MulmoVideoFilter): string | null => {
  switch (filter.type) {
    case "blur":
      return `boxblur=${filter.radius}:${filter.power}`;
    case "gblur":
      return `gblur=sigma=${filter.sigma}`;
    case "avgblur":
      return `avgblur=sizeX=${filter.sizeX}:sizeY=${filter.sizeY}`;
    case "unsharp": {
      const parts = [
        `luma_msize_x=${filter.luma_msize_x ?? 5}`,
        `luma_msize_y=${filter.luma_msize_y ?? 5}`,
        `luma_amount=${filter.luma_amount ?? 1}`,
        `chroma_msize_x=${filter.chroma_msize_x ?? 5}`,
        `chroma_msize_y=${filter.chroma_msize_y ?? 5}`,
        `chroma_amount=${filter.chroma_amount ?? 0}`,
      ];
      return `unsharp=${parts.join(":")}`;
    }
    default:
      return null;
  }
};

const convertEdgeNoiseFilter = (filter: MulmoVideoFilter): string | null => {
  switch (filter.type) {
    case "edgedetect": {
      const parts = [`low=${filter.low ?? 0.2}`, `high=${filter.high ?? 0.4}`, `mode=${filter.mode ?? "wires"}`];
      return `edgedetect=${parts.join(":")}`;
    }
    case "sobel": {
      const parts = [`planes=${filter.planes ?? 15}`, `scale=${filter.scale ?? 1}`, `delta=${filter.delta ?? 0}`];
      return `sobel=${parts.join(":")}`;
    }
    case "emboss":
      return "convolution='0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0:0 -1 0 -1 5 -1 0 -1 0'";
    case "glitch":
      if (filter.style === "blend") {
        return `tblend=all_mode=difference,noise=alls=${filter.intensity}`;
      }
      return `noise=alls=${filter.intensity}:allf=t+u`;
    case "grain":
      return `noise=alls=${filter.intensity}:allf=t`;
    default:
      return null;
  }
};

const convertTransformEffectFilter = (filter: MulmoVideoFilter): string | null => {
  switch (filter.type) {
    case "hflip":
      return "hflip";
    case "vflip":
      return "vflip";
    case "rotate":
      return `rotate=angle=${filter.angle}:fillcolor=${filter.fillcolor}`;
    case "transpose": {
      const dirMap = { cclock: "0", clock: "1", cclock_flip: "2", clock_flip: "3" };
      return `transpose=dir=${dirMap[filter.dir]}`;
    }
    case "vignette": {
      const parts = [`angle=${filter.angle ?? Math.PI / 5}`];
      if (filter.x0 !== undefined) parts.push(`x0=${filter.x0}`);
      if (filter.y0 !== undefined) parts.push(`y0=${filter.y0}`);
      parts.push(`mode=${filter.mode ?? "forward"}`);
      return `vignette=${parts.join(":")}`;
    }
    case "fade":
      return `fade=type=${filter.mode}:start_frame=${filter.start_frame}:nb_frames=${filter.nb_frames}${filter.alpha ? ":alpha=1" : ""}:color=${filter.color}`;
    case "pixelize":
      return `scale=iw/${filter.width}:ih/${filter.height},scale=${filter.width}*iw:${filter.height}*ih:flags=neighbor`;
    case "pseudocolor":
      return `pseudocolor=preset=${filter.preset}`;
    default:
      return null;
  }
};

const convertTemporalDistortionFilter = (filter: MulmoVideoFilter): string | null => {
  switch (filter.type) {
    case "tmix": {
      const weights = filter.weights ? `:weights=${filter.weights}` : "";
      return `tmix=frames=${filter.frames}${weights}`;
    }
    case "lagfun": {
      const parts = [`decay=${filter.decay ?? 0.95}`, `planes=${filter.planes ?? 15}`];
      return `lagfun=${parts.join(":")}`;
    }
    case "threshold":
      return `threshold=planes=${filter.planes}`;
    case "elbg":
      return `elbg=l=${filter.codebook_length}`;
    case "lensdistortion":
      return `lenscorrection=k1=${filter.k1}:k2=${filter.k2}`;
    case "chromashift": {
      const parts = [`cbh=${filter.cbh ?? 0}`, `cbv=${filter.cbv ?? 0}`, `crh=${filter.crh ?? 0}`, `crv=${filter.crv ?? 0}`, `edge=${filter.edge ?? "smear"}`];
      return `chromashift=${parts.join(":")}`;
    }
    case "deflicker":
      return `deflicker=size=${filter.size}:mode=${filter.mode}`;
    case "dctdnoiz":
      return `dctdnoiz=sigma=${filter.sigma}`;
    default:
      return null;
  }
};

/**
 * Convert video filter objects to FFmpeg filter strings
 * @param filter - Video filter configuration object
 * @returns FFmpeg filter string
 */
export const convertVideoFilterToFFmpeg = (filter: MulmoVideoFilter): string => {
  if (filter.type === "custom") {
    return filter.filter;
  }

  // Try each category converter
  return (
    convertColorFilter(filter) ||
    convertBlurSharpenFilter(filter) ||
    convertEdgeNoiseFilter(filter) ||
    convertTransformEffectFilter(filter) ||
    convertTemporalDistortionFilter(filter) ||
    ""
  );
};
