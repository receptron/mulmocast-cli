import { z } from "zod";

export const langSchema = z.string();
const URLStringSchema = z.string().url();

export const localizedTextSchema = z.object({
  text: z.string(),
  lang: z.string(),
  // caption: z.string(),
  texts: z.array(z.string()).optional(),
  ttsTexts: z.array(z.string()).optional(),
  duration: z.number().optional(), // generated // video duration time(ms)
  filename: z.string(), // generated //
});

export const multiLingualTextsSchema = z.record(langSchema, localizedTextSchema);

const speakerIdSchema = z.string();

const speakerDataSchema = z.object({
  displayName: z.record(langSchema, z.string()),
  voiceId: z.string(),
});

export const speakerDictionarySchema = z.record(speakerIdSchema, speakerDataSchema);

const mediaSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: URLStringSchema }), // https://example.com/foo.pdf
  z.object({ kind: z.literal("data"), data: z.string() }), // base64
  z.object({ kind: z.literal("file"), filename: z.string() }), // foo.pdf
]);

// String is easier for AI, string array is easier for human
const stringOrStringArray = z.union([z.string(), z.array(z.string())]);

const MulmoMarkdownMediaSchema = z.object({
  type: z.literal("markdown"),
  markdown: stringOrStringArray,
});

const MulmoWebMediaSchema = z.object({
  type: z.literal("web"),
  url: URLStringSchema,
});

const MulmoPdfMediaSchema = z.object({
  type: z.literal("pdf"),
  source: mediaSourceSchema,
});

const MulmoImageMediaSchema = z.object({
  type: z.literal("image"),
  source: mediaSourceSchema,
});

const MulmoSvgMediaSchema = z.object({
  type: z.literal("svg"),
  source: mediaSourceSchema,
});

const MulmoMovieMediaSchema = z.object({
  type: z.literal("movie"),
  source: mediaSourceSchema,
});

const MulmoTextSlideMediaSchema = z.object({
  type: z.literal("textSlide"),
  slide: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
  }),
});

export const mulmoMediaSchema = z.union([
  MulmoMarkdownMediaSchema,
  MulmoWebMediaSchema,
  MulmoPdfMediaSchema,
  MulmoImageMediaSchema,
  MulmoSvgMediaSchema,
  MulmoMovieMediaSchema,
  MulmoTextSlideMediaSchema,
]);

export const text2imageParamsSchema = z.object({
  model: z.string().optional(), // default: provider specific
  size: z.string().optional(), // default: provider specific
  style: z.string().optional(), // optional image style
  moderation: z.string().optional(), // optional image style
});

export const text2speechParamsSchema = z.object({
  speed: z.number().optional(), // default: 1.0
  instruction: z.string().optional(),
});

export const textSlideParamsSchema = z.object({
  cssStyles: z.array(z.string()),
});

export const videoParamsSchema = z.object({
  padding: z.number().optional(), // msec
});

export const audioParamsSchema = z.object({
  bgm: z.string().optional(), // path to MP3 file
});

export const mulmoBeatSchema = z.object({
  speaker: speakerIdSchema,
  text: z.string(),
  media: mulmoMediaSchema.optional(),

  imageParams: text2imageParamsSchema.optional(), // beat specific parameters
  speechParams: text2speechParamsSchema.optional(),
  textSlideParams: textSlideParamsSchema.optional(),
  imagePrompt: z.string().optional(), // specified or inserted by preprocessor
  image: z.string().optional(), // path to the image
});

export const mulmoDimensionSchema = z.object({
  width: z.number(),
  height: z.number(),
});

// export const voiceMapSchema = z.record(speakerIdSchema, z.string())

export const mulmoCastCreditSchema = z.object({
  version: z.literal("1.0"),
  credit: z.literal("closing").optional(),
});

export const mulmoScriptSchema = z.object({
  // global settings
  $mulmocast: mulmoCastCreditSchema,
  title: z.string(),
  description: z.string().optional(),
  reference: z.string().optional(),
  lang: langSchema.optional(), // default "en"
  canvasSize: mulmoDimensionSchema.optional(),

  // page/slide
  beats: z.array(mulmoBeatSchema),

  // for text2speech
  speechParams: text2speechParamsSchema.extend({
    provider: z.string().optional(),
    speakers: speakerDictionarySchema,
  }),

  // for text2image
  imageParams: text2imageParamsSchema
    .extend({
      provider: z.string().optional(),
    })
    .optional(),

  audioParams: audioParamsSchema.optional(),

  // for textSlides
  textSlideParams: textSlideParamsSchema.optional(),
  videoParams: videoParamsSchema.optional(),

  // images: ImageInfo[] // generated
  imagePath: z.string().optional(), // for keynote images movie ??
  omitCaptions: z.boolean().optional(), // default is false

  // for debugging
  __test_invalid__: z.boolean().optional(),
});

export const mulmoStudioBeatSchema = mulmoBeatSchema.extend({
  multiLingualTexts: multiLingualTextsSchema.optional(),
  hash: z.string().optional(),
  duration: z.number().optional(),
  filename: z.string().optional(),
});

export const mulmoStudioSchema = z.object({
  script: mulmoScriptSchema,
  filename: z.string(),
  beats: z.array(mulmoStudioBeatSchema),
});

export const mulmoScriptTemplateSchema = z.object({
  systemPrompt: z.string(),
  script: mulmoScriptSchema,
});

export const urlsSchema = z.array(z.string().url({ message: "Invalid URL format" }));
