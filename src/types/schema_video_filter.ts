import { z } from "zod";

// Video filter schemas

// Color adjustment filters
export const mulmoVideoFilterMonoSchema = z.object({
  type: z.literal("mono"),
});

export const mulmoVideoFilterSepiaSchema = z.object({
  type: z.literal("sepia"),
});

export const mulmoVideoFilterBrightnessContrastSchema = z.object({
  type: z.literal("brightness_contrast"),
  brightness: z.number().min(-1).max(1).optional().default(0),
  contrast: z.number().min(0).max(3).optional().default(1),
});

export const mulmoVideoFilterHueSchema = z.object({
  type: z.literal("hue"),
  hue: z.number().min(-180).max(180).optional().default(0), // hue angle in degrees
  saturation: z.number().min(-10).max(10).optional().default(1), // saturation multiplier
  brightness: z.number().min(-10).max(10).optional().default(0), // brightness offset
});

export const mulmoVideoFilterColorBalanceSchema = z.object({
  type: z.literal("colorbalance"),
  rs: z.number().min(-1).max(1).optional().default(0), // red shadows
  gs: z.number().min(-1).max(1).optional().default(0), // green shadows
  bs: z.number().min(-1).max(1).optional().default(0), // blue shadows
  rm: z.number().min(-1).max(1).optional().default(0), // red midtones
  gm: z.number().min(-1).max(1).optional().default(0), // green midtones
  bm: z.number().min(-1).max(1).optional().default(0), // blue midtones
  rh: z.number().min(-1).max(1).optional().default(0), // red highlights
  gh: z.number().min(-1).max(1).optional().default(0), // green highlights
  bh: z.number().min(-1).max(1).optional().default(0), // blue highlights
});

export const mulmoVideoFilterVibranceSchema = z.object({
  type: z.literal("vibrance"),
  intensity: z.number().min(-2).max(2).optional().default(0), // vibrance intensity
});

export const mulmoVideoFilterNegateSchema = z.object({
  type: z.literal("negate"),
  negate_alpha: z.boolean().optional().default(false),
});

export const mulmoVideoFilterColorHoldSchema = z.object({
  type: z.literal("colorhold"),
  color: z.string().optional().default("red"), // color to keep (e.g., "red", "0xFF0000")
  similarity: z.number().min(0).max(1).optional().default(0.01),
  blend: z.number().min(0).max(1).optional().default(0),
});

export const mulmoVideoFilterColorKeySchema = z.object({
  type: z.literal("colorkey"),
  color: z.string().optional().default("green"), // color to make transparent
  similarity: z.number().min(0).max(1).optional().default(0.01),
  blend: z.number().min(0).max(1).optional().default(0),
});

// Blur filters
export const mulmoVideoFilterBlurSchema = z.object({
  type: z.literal("blur"),
  radius: z.number().min(1).max(50).optional().default(10),
  power: z.number().min(1).max(10).optional().default(1),
});

export const mulmoVideoFilterGBlurSchema = z.object({
  type: z.literal("gblur"),
  sigma: z.number().min(0).max(100).optional().default(30),
});

export const mulmoVideoFilterAvgBlurSchema = z.object({
  type: z.literal("avgblur"),
  sizeX: z.number().min(1).max(100).optional().default(10),
  sizeY: z.number().min(1).max(100).optional().default(10),
});

// Sharpen filters
export const mulmoVideoFilterUnsharpSchema = z.object({
  type: z.literal("unsharp"),
  luma_msize_x: z.number().min(3).max(23).optional().default(5),
  luma_msize_y: z.number().min(3).max(23).optional().default(5),
  luma_amount: z.number().min(-2).max(5).optional().default(1),
  chroma_msize_x: z.number().min(3).max(23).optional().default(5),
  chroma_msize_y: z.number().min(3).max(23).optional().default(5),
  chroma_amount: z.number().min(-2).max(5).optional().default(0),
});

// Edge detection and effects
export const mulmoVideoFilterEdgeDetectSchema = z.object({
  type: z.literal("edgedetect"),
  low: z.number().min(0).max(1).optional().default(0.2),
  high: z.number().min(0).max(1).optional().default(0.4),
  mode: z.enum(["wires", "colormix", "canny"]).optional().default("wires"),
});

export const mulmoVideoFilterSobelSchema = z.object({
  type: z.literal("sobel"),
  planes: z.number().min(0).max(15).optional().default(15),
  scale: z.number().min(0).max(65535).optional().default(1),
  delta: z.number().min(-65535).max(65535).optional().default(0),
});

export const mulmoVideoFilterEmbossSchema = z.object({
  type: z.literal("emboss"),
});

// Noise and grain
export const mulmoVideoFilterGlitchSchema = z.object({
  type: z.literal("glitch"),
  intensity: z.number().min(1).max(100).optional().default(20),
  style: z.enum(["noise", "blend"]).optional().default("noise"),
});

export const mulmoVideoFilterGrainSchema = z.object({
  type: z.literal("grain"),
  intensity: z.number().min(1).max(100).optional().default(10),
});

// Transform filters
export const mulmoVideoFilterHFlipSchema = z.object({
  type: z.literal("hflip"),
});

export const mulmoVideoFilterVFlipSchema = z.object({
  type: z.literal("vflip"),
});

export const mulmoVideoFilterRotateSchema = z.object({
  type: z.literal("rotate"),
  angle: z.number().optional().default(0), // angle in radians (use degrees * PI/180)
  fillcolor: z.string().optional().default("black"),
});

export const mulmoVideoFilterTransposeSchema = z.object({
  type: z.literal("transpose"),
  dir: z.enum(["cclock", "clock", "cclock_flip", "clock_flip"]).optional().default("clock"),
});

// Effects
export const mulmoVideoFilterVignetteSchema = z.object({
  type: z.literal("vignette"),
  angle: z
    .number()
    .min(0)
    .max(Math.PI)
    .optional()
    .default(Math.PI / 5), // angle in radians
  x0: z.number().min(0).max(1).optional(), // center x (0-1)
  y0: z.number().min(0).max(1).optional(), // center y (0-1)
  mode: z.enum(["forward", "backward"]).optional().default("forward"),
});

export const mulmoVideoFilterFadeSchema = z.object({
  type: z.literal("fade"),
  mode: z.enum(["in", "out"]).optional().default("in"),
  start_frame: z.number().min(0).optional().default(0),
  nb_frames: z.number().min(1).optional().default(25),
  alpha: z.boolean().optional().default(false),
  color: z.string().optional().default("black"),
});

export const mulmoVideoFilterPixelizeSchema = z.object({
  type: z.literal("pixelize"),
  width: z.number().min(1).max(1000).optional().default(16),
  height: z.number().min(1).max(1000).optional().default(16),
  mode: z.enum(["avg", "min", "max"]).optional().default("avg"),
});

export const mulmoVideoFilterPseudoColorSchema = z.object({
  type: z.literal("pseudocolor"),
  preset: z
    .enum(["magma", "inferno", "plasma", "viridis", "turbo", "cividis", "range1", "range2", "shadows", "highlights", "solar", "nominal", "preferred", "total"])
    .optional()
    .default("magma"),
});

// Temporal effects
export const mulmoVideoFilterTmixSchema = z.object({
  type: z.literal("tmix"),
  frames: z.number().min(1).max(1024).optional().default(3),
  weights: z.string().optional(), // e.g., "1 2 1"
});

export const mulmoVideoFilterLagfunSchema = z.object({
  type: z.literal("lagfun"),
  decay: z.number().min(0).max(1).optional().default(0.95),
  planes: z.number().min(0).max(15).optional().default(15),
});

// Threshold and posterize
export const mulmoVideoFilterThresholdSchema = z.object({
  type: z.literal("threshold"),
  planes: z.number().min(0).max(15).optional().default(15),
});

export const mulmoVideoFilterElbgSchema = z.object({
  type: z.literal("elbg"),
  codebook_length: z.number().min(1).max(256).optional().default(256),
});

// Distortion
export const mulmoVideoFilterLensDistortionSchema = z.object({
  type: z.literal("lensdistortion"),
  k1: z.number().min(-1).max(1).optional().default(0),
  k2: z.number().min(-1).max(1).optional().default(0),
});

// Chromatic effects
export const mulmoVideoFilterChromaShiftSchema = z.object({
  type: z.literal("chromashift"),
  cbh: z.number().min(-255).max(255).optional().default(0), // horizontal shift for Cb
  cbv: z.number().min(-255).max(255).optional().default(0), // vertical shift for Cb
  crh: z.number().min(-255).max(255).optional().default(0), // horizontal shift for Cr
  crv: z.number().min(-255).max(255).optional().default(0), // vertical shift for Cr
  edge: z.enum(["smear", "wrap"]).optional().default("smear"),
});

// Deflicker and denoise
export const mulmoVideoFilterDeflickerSchema = z.object({
  type: z.literal("deflicker"),
  size: z.number().min(2).max(129).optional().default(5),
  mode: z.enum(["am", "gm", "hm", "qm", "cm", "pm", "median"]).optional().default("am"),
});

export const mulmoVideoFilterDctDenoiseSchema = z.object({
  type: z.literal("dctdnoiz"),
  sigma: z.number().min(0).max(999).optional().default(10),
});

// Custom filter
export const mulmoVideoFilterCustomSchema = z.object({
  type: z.literal("custom"),
  filter: z.string(),
});

export const mulmoVideoFilterSchema = z.union([
  // Color adjustment
  mulmoVideoFilterMonoSchema,
  mulmoVideoFilterSepiaSchema,
  mulmoVideoFilterBrightnessContrastSchema,
  mulmoVideoFilterHueSchema,
  mulmoVideoFilterColorBalanceSchema,
  mulmoVideoFilterVibranceSchema,
  mulmoVideoFilterNegateSchema,
  mulmoVideoFilterColorHoldSchema,
  mulmoVideoFilterColorKeySchema,
  // Blur
  mulmoVideoFilterBlurSchema,
  mulmoVideoFilterGBlurSchema,
  mulmoVideoFilterAvgBlurSchema,
  // Sharpen
  mulmoVideoFilterUnsharpSchema,
  // Edge detection
  mulmoVideoFilterEdgeDetectSchema,
  mulmoVideoFilterSobelSchema,
  mulmoVideoFilterEmbossSchema,
  // Noise and grain
  mulmoVideoFilterGlitchSchema,
  mulmoVideoFilterGrainSchema,
  // Transform
  mulmoVideoFilterHFlipSchema,
  mulmoVideoFilterVFlipSchema,
  mulmoVideoFilterRotateSchema,
  mulmoVideoFilterTransposeSchema,
  // Effects
  mulmoVideoFilterVignetteSchema,
  mulmoVideoFilterFadeSchema,
  mulmoVideoFilterPixelizeSchema,
  mulmoVideoFilterPseudoColorSchema,
  // Temporal
  mulmoVideoFilterTmixSchema,
  mulmoVideoFilterLagfunSchema,
  // Threshold
  mulmoVideoFilterThresholdSchema,
  mulmoVideoFilterElbgSchema,
  // Distortion
  mulmoVideoFilterLensDistortionSchema,
  // Chromatic
  mulmoVideoFilterChromaShiftSchema,
  // Deflicker
  mulmoVideoFilterDeflickerSchema,
  mulmoVideoFilterDctDenoiseSchema,
  // Custom
  mulmoVideoFilterCustomSchema,
]);
