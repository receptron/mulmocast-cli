import { z } from "zod";

export const langSchema = z.string();
const URLStringSchema = z.string().url();

export const localizedTextSchema = z
  .object({
    text: z.string(),
    lang: langSchema,
    // caption: z.string(),
    texts: z.array(z.string()).optional(),
    ttsTexts: z.array(z.string()).optional(),
    duration: z.number().optional(), // generated // video duration time(ms)
    // filename: z.string().optional(), // generated //
  })
  .strict();

export const multiLingualTextsSchema = z.record(langSchema, localizedTextSchema);

export const speechOptionsSchema = z
  .object({
    speed: z.number().optional(), // default: 1.0
    instruction: z.string().optional(),
  })
  .strict();

const speakerIdSchema = z.string();

export const text2SpeechProviderSchema = z.enum(["openai", "nijivoice", "google", "elevenlabs"]).default("openai");

export const speakerDataSchema = z
  .object({
    displayName: z.record(langSchema, z.string()).optional(),
    voiceId: z.string(),
    speechOptions: speechOptionsSchema.optional(),
    provider: text2SpeechProviderSchema.optional(),
  })
  .strict();

export const speakerDictionarySchema = z.record(speakerIdSchema, speakerDataSchema);

export const mediaSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: URLStringSchema }).strict(), // https://example.com/foo.pdf
  z.object({ kind: z.literal("base64"), data: z.string() }).strict(), // base64
  z.object({ kind: z.literal("text"), text: z.string() }).strict(), // plain text
  z.object({ kind: z.literal("path"), path: z.string() }).strict(), // foo.pdf
]);

// String is easier for AI, string array is easier for human
const stringOrStringArray = z.union([z.string(), z.array(z.string())]);

export const mulmoMarkdownMediaSchema = z
  .object({
    type: z.literal("markdown"),
    markdown: stringOrStringArray,
  })
  .strict();

const mulmoWebMediaSchema = z
  .object({
    type: z.literal("web"),
    url: URLStringSchema,
  })
  .strict();

const mulmoPdfMediaSchema = z
  .object({
    type: z.literal("pdf"),
    source: mediaSourceSchema,
  })
  .strict();

export const mulmoImageMediaSchema = z
  .object({
    type: z.literal("image"),
    source: mediaSourceSchema,
  })
  .strict();

const mulmoSvgMediaSchema = z
  .object({
    type: z.literal("svg"),
    source: mediaSourceSchema,
  })
  .strict();

const mulmoMovieMediaSchema = z
  .object({
    type: z.literal("movie"),
    source: mediaSourceSchema,
  })
  .strict();

export const mulmoTextSlideMediaSchema = z
  .object({
    type: z.literal("textSlide"),
    slide: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      bullets: z.array(z.string()).optional(),
    }),
  })
  .strict();

export const mulmoCaptionParamsSchema = z
  .object({
    lang: langSchema.optional(),
    styles: z.array(z.string()).default([]), // css styles
  })
  .strict();

export const mulmoChartMediaSchema = z
  .object({
    type: z.literal("chart"),
    title: z.string(),
    chartData: z.record(z.any()),
  })
  .strict();

export const mulmoMermaidMediaSchema = z
  .object({
    type: z.literal("mermaid"),
    title: z.string().describe("The title of the diagram"),
    code: mediaSourceSchema.describe("The code of the mermaid diagram"),
    appendix: z.array(z.string()).optional().describe("The appendix of the mermaid diagram; typically, style information."),
  })
  .strict();

export const mulmoHtmlTailwindMediaSchema = z
  .object({
    type: z.literal("html_tailwind"),
    html: stringOrStringArray,
  })
  .strict();

export const mulmoBeatReferenceMediaSchema = z
  .object({
    type: z.literal("beat"),
    id: z.string().optional().describe("Specifies the beat to reference."),
  })
  .strict();

export const mulmoVoiceOverMediaSchema = z
  .object({
    type: z.literal("voice_over"),
    startAt: z.number().optional().describe("The time to start the voice over the video in seconds."),
  })
  .strict();

export const mulmoImageAssetSchema = z.union([
  mulmoMarkdownMediaSchema,
  mulmoWebMediaSchema,
  mulmoPdfMediaSchema,
  mulmoImageMediaSchema,
  mulmoSvgMediaSchema,
  mulmoMovieMediaSchema.extend({
    mixAudio: z.number().default(1.0),
  }),
  mulmoTextSlideMediaSchema,
  mulmoChartMediaSchema,
  mulmoMermaidMediaSchema,
  mulmoHtmlTailwindMediaSchema,
  mulmoBeatReferenceMediaSchema,
  mulmoVoiceOverMediaSchema,
]);

const mulmoAudioMediaSchema = z
  .object({
    type: z.literal("audio"),
    source: mediaSourceSchema,
  })
  .strict();

const mulmoMidiMediaSchema = z
  .object({
    type: z.literal("midi"),
    source: z.string(), // TODO: define it later
  })
  .strict();

export const mulmoAudioAssetSchema = z.union([mulmoAudioMediaSchema, mulmoMidiMediaSchema]);

const imageIdSchema = z.string();

export const mulmoImagePromptMediaSchema = z
  .object({
    type: z.literal("imagePrompt"),
    prompt: z.string(),
  })
  .strict();

export const mulmoImageParamsImagesSchema = z.record(imageIdSchema, z.union([mulmoImageMediaSchema, mulmoImagePromptMediaSchema]));
export const mulmoFillOptionSchema = z
  .object({
    style: z.enum(["aspectFit", "aspectFill"]).default("aspectFit"),
  })
  .describe("How to handle aspect ratio differences between image and canvas");

export const text2ImageProviderSchema = z.enum(["openai", "google"]).default("openai");

// NOTE: This is for UI only. (until we figure out how to use it in mulmoImageParamsSchema)
export const mulmoOpenAIImageModelSchema = z
  .object({
    provider: z.literal("openai"),
    model: z.enum(["dall-e-3", "gpt-image-1"]).optional(),
  })
  .strict();

// NOTE: This is for UI only. (until we figure out how to use it in mulmoImageParamsSchema)
export const mulmoGoogleImageModelSchema = z
  .object({
    provider: z.literal("google"),
    model: z.enum(["imagen-3.0-fast-generate-001", "imagen-3.0-generate-002", "imagen-3.0-capability-001"]).optional(),
  })
  .strict();

export const mulmoImageParamsSchema = z
  .object({
    provider: text2ImageProviderSchema, // has default value
    model: z.string().optional(), // default: provider specific
    style: z.string().optional(), // optional image style
    moderation: z.string().optional(), // optional image style
    images: mulmoImageParamsImagesSchema.optional(),
  })
  .strict();

export const textSlideParamsSchema = z
  .object({
    cssStyles: stringOrStringArray,
  })
  .strict();

export const beatAudioParamsSchema = z
  .object({
    padding: z.number().optional().describe("Padding between beats"), // seconds
  })
  .strict();

export const mulmoHtmlImageParamsSchema = z
  .object({
    model: z.string().optional(), // default: provider specific
  })
  .strict();

// Note: we can't extend beatAudioParamsSchema because it has padding as optional
export const audioParamsSchema = z
  .object({
    padding: z.number().default(0.3).describe("Padding between beats"), // seconds
    introPadding: z.number().default(1.0).describe("Padding at the beginning of the audio"), // seconds
    closingPadding: z.number().default(0.8).describe("Padding before the last beat"), // seconds
    outroPadding: z.number().default(1.0).describe("Padding at the end of the audio"), // seconds
    bgm: mediaSourceSchema.optional(),
    bgmVolume: z.number().default(0.2).describe("Volume of the background music"),
    audioVolume: z.number().default(1.0).describe("Volume of the audio"),
    suppressSpeech: z.boolean().default(false).describe("Suppress speech generation"),
  })
  .strict();

export const htmlPromptParamsSchema = z
  .object({
    systemPrompt: z.string().default("").optional(),
    prompt: z.string().default(""),
    data: z.any().optional(),
    images: z.record(z.any()).optional(),
  })
  .strict();

export const mulmoBeatSchema = z
  .object({
    speaker: speakerIdSchema.default("Presenter"),
    text: z.string().default("").describe("Text to be spoken. If empty, the audio is not generated."),
    id: z.string().optional().describe("Unique identifier for the beat."),
    description: z.string().optional(),
    image: mulmoImageAssetSchema.optional(),
    audio: mulmoAudioAssetSchema.optional(),
    duration: z.number().optional().describe("Duration of the beat. Used only when the text is empty"),

    imageParams: mulmoImageParamsSchema.optional(), // beat specific parameters
    audioParams: beatAudioParamsSchema.optional(), // beat specific parameters
    movieParams: z
      .object({
        model: z.string().optional(),
        fillOption: mulmoFillOptionSchema.optional(),
        speed: z.number().optional().describe("Speed of the video. 1.0 is normal speed. 0.5 is half speed. 2.0 is double speed."),
      })
      .optional(),
    htmlImageParams: mulmoHtmlImageParamsSchema.optional(),
    speechOptions: speechOptionsSchema.optional(),
    textSlideParams: textSlideParamsSchema.optional(),
    captionParams: mulmoCaptionParamsSchema.optional(),
    imageNames: z.array(imageIdSchema).optional(), // list of image names to use for image generation. The default is all images in the imageParams.images.
    imagePrompt: z.string().optional(),
    moviePrompt: z.string().optional(),
    htmlPrompt: htmlPromptParamsSchema.optional(),
  })
  .strict();

export const mulmoCanvasDimensionSchema = z
  .object({
    width: z.number(),
    height: z.number(),
  })
  .default({ width: 1280, height: 720 });

// export const voiceMapSchema = z.record(speakerIdSchema, z.string())

export const mulmoCastCreditSchema = z
  .object({
    version: z.literal("1.0"),
    credit: z.literal("closing").optional(),
  })
  .strict();

export const mulmoSpeechParamsSchema = z
  .object({
    provider: text2SpeechProviderSchema, // has default value
    speakers: speakerDictionarySchema,
  })
  .strict();

export const text2HtmlImageProviderSchema = z.enum(["openai", "anthropic"]).default("openai");
export const text2MovieProviderSchema = z.enum(["google", "replicate"]).default("google");

// NOTE: This is UI only. (until we figure out how to use it in mulmoMovieParamsSchema)
export const mulmoGoogleMovieModelSchema = z
  .object({
    provider: z.literal("google"),
    model: z.enum(["veo-2.0-generate-001"]).optional(),
  })
  .strict();

// NOTE: This is UI only. (until we figure out how to use it in mulmoMovieParamsSchema)
export const mulmoReplicateMovieModelSchema = z
  .object({
    provider: z.literal("replicate"),
    model: z.enum(["bytedance/seedance-1-lite", "kwaivgi/kling-v2.1", "google/veo-3", "minimax/video-01"]).optional(),
  })
  .strict();

export const mulmoTransitionSchema = z.object({
  type: z.enum(["fade", "slideout_left"]),
  duration: z.number().min(0).max(2).default(0.3), // transition duration in seconds
});

export const mulmoMovieParamsSchema = z
  .object({
    provider: text2MovieProviderSchema.optional(),
    model: z.string().optional(), // default: provider specific
    transition: mulmoTransitionSchema.optional(),
    fillOption: mulmoFillOptionSchema.optional(),
  })
  .strict();

export const mulmoPresentationStyleSchema = z.object({
  $mulmocast: mulmoCastCreditSchema,
  canvasSize: mulmoCanvasDimensionSchema, // has default value
  speechParams: mulmoSpeechParamsSchema.default({
    speakers: {
      Presenter: {
        voiceId: "shimmer",
        displayName: {
          en: "Presenter",
        },
      },
    },
  }),
  imageParams: mulmoImageParamsSchema.optional(),
  movieParams: mulmoMovieParamsSchema.optional(),
  htmlImageParams: mulmoHtmlImageParamsSchema
    .extend({
      provider: text2HtmlImageProviderSchema,
    })
    .optional(),
  // for textSlides
  textSlideParams: textSlideParamsSchema.optional(),
  captionParams: mulmoCaptionParamsSchema.optional(),
  audioParams: audioParamsSchema.default({
    introPadding: 1.0,
    padding: 0.3,
    closingPadding: 0.8,
    outroPadding: 1.0,
    bgmVolume: 0.2,
    audioVolume: 1.0,
  }),
});

export const mulmoReferenceSchema = z.object({
  url: URLStringSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.union([z.enum(["article", "paper", "image", "video", "audio"]), z.string()]).default("article"),
});

export const mulmoScriptSchema = mulmoPresentationStyleSchema
  .extend({
    title: z.string().optional(),
    description: z.string().optional(),
    references: z.array(mulmoReferenceSchema).optional(),
    lang: langSchema.optional(), // default "en"
    beats: z.array(mulmoBeatSchema).min(1),

    // TODO: Delete it later
    imagePath: z.string().optional(), // for keynote images movie ??

    // for debugging
    __test_invalid__: z.boolean().optional(),
  })
  .strict();

export const mulmoStudioBeatSchema = z
  .object({
    hash: z.string().optional(),
    duration: z.number().optional(),
    startAt: z.number().optional(),
    audioDuration: z.number().optional(),
    movieDuration: z.number().optional(),
    silenceDuration: z.number().optional(),
    audioFile: z.string().optional(),
    imageFile: z.string().optional(), // path to the image
    movieFile: z.string().optional(), // path to the movie file
    captionFile: z.string().optional(), // path to the caption image
  })
  .strict();

export const mulmoStudioMultiLingualDataSchema = z.object({
  multiLingualTexts: multiLingualTextsSchema,
});

export const mulmoStudioMultiLingualSchema = z.array(mulmoStudioMultiLingualDataSchema).min(1);

export const mulmoSessionStateSchema = z.object({
  inSession: z.object({
    audio: z.boolean(),
    image: z.boolean(),
    video: z.boolean(),
    multiLingual: z.boolean(),
    caption: z.boolean(),
    pdf: z.boolean(),
  }),
  inBeatSession: z.object({
    audio: z.record(z.number().int(), z.boolean()),
    image: z.record(z.number().int(), z.boolean()),
    movie: z.record(z.number().int(), z.boolean()),
    multiLingual: z.record(z.number().int(), z.boolean()),
    caption: z.record(z.number().int(), z.boolean()),
    html: z.record(z.number().int(), z.boolean()),
    imageReference: z.record(z.number().int(), z.boolean()),
  }),
});

export const mulmoStudioSchema = z
  .object({
    script: mulmoScriptSchema,
    filename: z.string(),
    beats: z.array(mulmoStudioBeatSchema).min(1),
  })
  .strict();

export const mulmoScriptTemplateSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    scriptName: z.string().optional(),
    presentationStyle: mulmoPresentationStyleSchema.optional(),
  })
  .strict();

export const mulmoScriptTemplateFileSchema = mulmoScriptTemplateSchema.extend({
  filename: z.string(),
});

export const mulmoStoryboardSceneSchema = z
  .object({
    description: z.string(),
    references: z.array(mulmoReferenceSchema).optional(),
  })
  .describe("A detailed description of the content of the scene, not the presentation style")
  .strict();

export const mulmoStoryboardSchema = z
  .object({
    title: z.string(),
    references: z.array(mulmoReferenceSchema).optional(),
    scenes: z.array(mulmoStoryboardSceneSchema),
  })
  .describe("A storyboard for a presentation, a story, a video, etc.")
  .strict();

export const urlsSchema = z.array(z.string().url({ message: "Invalid URL format" }));
