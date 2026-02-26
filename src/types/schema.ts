import { z } from "zod";
import { htmlLLMProvider, provider2TTSAgent, provider2ImageAgent, provider2MovieAgent, defaultProviders, provider2SoundEffectAgent } from "./provider2agent.js";
import { currentMulmoScriptVersion } from "./const.js";
import { mulmoVideoFilterSchema } from "./schema_video_filter.js";
import { mulmoSlideMediaSchema, slideThemeSchema, slideBrandingSchema } from "./slide.js";

// Re-export video filter schema
export { mulmoVideoFilterSchema } from "./schema_video_filter.js";

// Re-export slide schema
export { mulmoSlideMediaSchema } from "./slide.js";

export const langSchema = z.string();
const URLStringSchema = z.url();

export const localizedTextSchema = z
  .object({
    text: z.string(),
    lang: langSchema,
    // caption: z.string(),
    texts: z.array(z.string()).optional(),
    ttsTexts: z.array(z.string()).optional(), // TODO remove
    cacheKey: z.string(),
    duration: z.number().optional(), // generated // video duration time(ms)
    // filename: z.string().optional(), // generated //
  })
  .strict();

export const multiLingualTextsSchema = z.record(langSchema, localizedTextSchema);

export const speechOptionsSchema = z
  .object({
    speed: z.number().optional(), // default: 1.0 for google, elevenlabs
    instruction: z.string().optional(), // for tts openai
    decoration: z.string().optional(), // for kotodama. default: neutral
    stability: z.number().optional(), // for elevenLabs
    similarity_boost: z.number().optional(), // for elevenLabs
  })
  .strict();

const speakerIdSchema = z.string();

export const defaultSpeaker = "Presenter";

export const text2SpeechProviderSchema = z.enum(Object.keys(provider2TTSAgent) as [string, ...string[]]).default(defaultProviders.tts);

export const speakerDataSchema = z
  .object({
    displayName: z.record(langSchema, z.string()).optional(),
    voiceId: z.string(),
    isDefault: z.boolean().optional(),
    speechOptions: speechOptionsSchema.optional(),
    provider: text2SpeechProviderSchema.optional(),
    model: z.string().optional().describe("TTS model to use for this speaker"),
    baseURL: z.string().optional(), // Azure/custom endpoint URL
    apiVersion: z.string().optional(), // Azure API version (e.g., "2025-04-01-preview")
  })
  .strict();

export const speakerSchema = speakerDataSchema.extend({
  lang: z.record(langSchema, speakerDataSchema).optional(),
});

export const speakerDictionarySchema = z.record(speakerIdSchema, speakerSchema);

export const mulmoSpeechParamsSchema = z
  .object({
    speakers: speakerDictionarySchema,
  })
  .default({
    speakers: {
      [defaultSpeaker]: {
        provider: defaultProviders.tts,
        voiceId: "shimmer",
        displayName: {
          en: defaultSpeaker,
        },
      },
    },
  });

export const mediaSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: URLStringSchema }).strict(), // https://example.com/foo.pdf
  z.object({ kind: z.literal("base64"), data: z.string().min(1) }).strict(), // base64
  z.object({ kind: z.literal("path"), path: z.string().min(1) }).strict(), // foo.pdf
]);

export const mediaSourceMermaidSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: URLStringSchema }).strict(), // https://example.com/foo.pdf
  z.object({ kind: z.literal("base64"), data: z.string().min(1) }).strict(), // base64
  z.object({ kind: z.literal("text"), text: z.string().min(1) }).strict(), // plain text
  z.object({ kind: z.literal("path"), path: z.string().min(1) }).strict(), // foo.pdf
]);

// Background image schema for markdown and textSlide
export const backgroundImageSourceSchema = z.object({
  source: mediaSourceSchema,
  size: z.enum(["cover", "contain", "fill", "auto"]).optional(), // default: "cover", "fill" stretches to 100% 100%
  opacity: z.number().min(0).max(1).optional(), // default: 1
});

export const backgroundImageSchema = z
  .union([
    z.string(), // Simple: URL string
    backgroundImageSourceSchema,
  ])
  .nullable()
  .optional();

// String is easier for AI, string array is easier for human
const stringOrStringArray = z.union([z.string(), z.array(z.string())]);

export const row2Schema = z.tuple([
  stringOrStringArray, // left
  stringOrStringArray, // right
]);

export const grid2x2Schema = z.tuple([
  stringOrStringArray, // top-left
  stringOrStringArray, // top-right
  stringOrStringArray, // bottom-left
  stringOrStringArray, // bottom-right
]);

// Frame: optional header and sidebar
const layoutFrameSchema = z.object({
  header: stringOrStringArray.optional(),
  "sidebar-left": stringOrStringArray.optional(),
});

// Main: exactly one of row-2, 2x2, or content
const layoutMainSchema = z.union([z.object({ "row-2": row2Schema }), z.object({ "2x2": grid2x2Schema }), z.object({ content: stringOrStringArray })]);

// Combine frame + main (loose validation - extra properties not rejected at schema level)
export const markdownLayoutSchema = layoutFrameSchema.and(layoutMainSchema);

export const mulmoMarkdownMediaSchema = z
  .object({
    type: z.literal("markdown"),
    markdown: z.union([stringOrStringArray, markdownLayoutSchema]),
    style: z.string().optional(),
    backgroundImage: backgroundImageSchema,
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
    style: z.string().optional(),
    backgroundImage: backgroundImageSchema,
  })
  .strict();

export const captionSplitSchema = z.enum(["none", "estimate"]).default("none");

export const textSplitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("delimiters"),
    delimiters: z.array(z.string()).optional(), // default: ["。", "？", "！", ".", "?", "!"]
  }),
]);

export const mulmoCaptionParamsSchema = z
  .object({
    lang: langSchema.optional(),
    styles: z.array(z.string()).optional(), // css styles
    captionSplit: captionSplitSchema.optional(), // how to determine caption timing
    textSplit: textSplitSchema.optional(), // how to split text into segments (default: none)
  })
  .strict();

export const mulmoChartMediaSchema = z
  .object({
    type: z.literal("chart"),
    title: z.string(),
    chartData: z.record(z.string(), z.any()),
  })
  .strict();

export const mulmoMermaidMediaSchema = z
  .object({
    type: z.literal("mermaid"),
    title: z.string().describe("The title of the diagram"),
    code: mediaSourceMermaidSchema.describe("The code of the mermaid diagram"),
    appendix: z.array(z.string()).optional().describe("The appendix of the mermaid diagram; typically, style information."),
    style: z.string().optional(),
    backgroundImage: backgroundImageSchema,
  })
  .strict();

export const htmlTailwindAnimationSchema = z.union([
  z.literal(true),
  z.object({
    fps: z.number().min(1).max(60).optional().default(30),
  }),
]);

export const mulmoHtmlTailwindMediaSchema = z
  .object({
    type: z.literal("html_tailwind"),
    html: stringOrStringArray,
    animation: htmlTailwindAnimationSchema
      .optional()
      .describe("Enable frame-based animation (Remotion-style). true for defaults (30fps), or { fps: N } for custom frame rate."),
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

export const mulmoVisionMediaSchema = z
  .object({
    type: z.literal("vision"),
    style: z.string().min(1),
    data: z.record(z.string(), z.any()),
  })
  .strict();

export const mulmoImageAssetSchema = z.union([
  mulmoMarkdownMediaSchema,
  mulmoWebMediaSchema,
  mulmoPdfMediaSchema,
  mulmoImageMediaSchema,
  mulmoSvgMediaSchema,
  mulmoMovieMediaSchema,
  mulmoTextSlideMediaSchema,
  mulmoChartMediaSchema,
  mulmoMermaidMediaSchema,
  mulmoHtmlTailwindMediaSchema,
  mulmoBeatReferenceMediaSchema,
  mulmoVoiceOverMediaSchema,
  mulmoVisionMediaSchema,
  mulmoSlideMediaSchema,
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
    prompt: z.string().min(1),
  })
  .strict();

export const mulmoImageParamsImagesValueSchema = z.union([mulmoImageMediaSchema, mulmoImagePromptMediaSchema]);
export const mulmoImageParamsImagesSchema = z.record(imageIdSchema, mulmoImageParamsImagesValueSchema);
export const mulmoFillOptionSchema = z
  .object({
    style: z.enum(["aspectFit", "aspectFill"]).optional().default("aspectFit"),
  })
  .describe("How to handle aspect ratio differences between image and canvas");

export const text2ImageProviderSchema = z.enum(Object.keys(provider2ImageAgent) as [string, ...string[]]).optional();

// NOTE: This is for UI only. (until we figure out how to use it in mulmoImageParamsSchema)
export const mulmoOpenAIImageModelSchema = z
  .object({
    provider: z.literal("openai"),
    model: z.enum(provider2ImageAgent["openai"].models as [string, ...string[]]).optional(),
    quality: z.enum(["low", "medium", "high", "auto"]).optional(),
  })
  .strict();

// NOTE: This is for UI only. (until we figure out how to use it in mulmoImageParamsSchema)
export const mulmoGoogleImageModelSchema = z
  .object({
    provider: z.literal("google"),
    model: z.enum(provider2ImageAgent["google"].models as [string, ...string[]]).optional(),
  })
  .strict();

export const mulmoBeatImageParamsSchema = z
  .object({
    provider: text2ImageProviderSchema, // has no default value (do not change it)
    model: z.string().optional(), // default: provider specific
    quality: z.string().optional(), // optional image quality (model specific)
    style: z.string().optional(), // optional image style
    moderation: z.string().optional(), // optional image style
    baseURL: z.string().optional(), // Azure/custom endpoint URL
    apiVersion: z.string().optional(), // Azure API version (e.g., "2025-04-01-preview")
    vertexai_project: z.string().optional(), // Google Cloud Project ID for Vertex AI
    vertexai_location: z.string().optional(), // Vertex AI location (default: us-central1)
  })
  .strict();

export const mulmoImageParamsSchema = mulmoBeatImageParamsSchema
  .extend({
    images: mulmoImageParamsImagesSchema.optional(),
    backgroundImage: backgroundImageSchema,
  })
  .strict();

export const textSlideParamsSchema = z
  .object({
    cssStyles: stringOrStringArray,
  })
  .strict();

export const mulmoSlideParamsSchema = z
  .object({
    theme: slideThemeSchema,
    branding: slideBrandingSchema.optional(),
  })
  .strict();

export const beatAudioParamsSchema = z
  .object({
    padding: z.number().optional().describe("Padding between beats"), // seconds
    movieVolume: z.number().optional().default(1.0).describe("Audio volume of the imported or generated movie"),
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
    padding: z.number().optional().default(0.3).describe("Padding between beats"), // seconds
    introPadding: z.number().optional().default(1.0).describe("Padding at the beginning of the audio"), // seconds
    closingPadding: z.number().optional().default(0.8).describe("Padding before the last beat"), // seconds
    outroPadding: z.number().optional().default(1.0).describe("Padding at the end of the audio"), // seconds
    bgm: mediaSourceSchema.optional(),
    bgmVolume: z.number().optional().default(0.2).describe("Volume of the background music"),
    audioVolume: z.number().optional().default(1.0).describe("Volume of the audio"),
    suppressSpeech: z.boolean().optional().default(false).describe("Suppress speech generation"),
  })
  .strict();

export const htmlPromptParamsSchema = z
  .object({
    systemPrompt: z.string().optional().default(""),
    prompt: z.string().min(1),
    data: z.any().optional(),
    images: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export const text2MovieProviderSchema = z.enum(Object.keys(provider2MovieAgent) as [string, ...string[]]);
export const text2SoundEffectProviderSchema = z.enum(Object.keys(provider2SoundEffectAgent) as [string, ...string[]]).default(defaultProviders.soundEffect);

export const mulmoSoundEffectParamsSchema = z.object({
  provider: text2SoundEffectProviderSchema.optional(),
  model: z.string().optional(), // default: provider specific
});

export const mulmoLipSyncParamsSchema = z.object({
  provider: z.string().optional(), // lip sync provider
  model: z.string().optional(), // default: provider specific
});

export const mulmoTransitionSchema = z.object({
  type: z.enum([
    "fade",
    "slideout_left",
    "slideout_right",
    "slideout_up",
    "slideout_down",
    "slidein_left",
    "slidein_right",
    "slidein_up",
    "slidein_down",
    "wipeleft",
    "wiperight",
    "wipeup",
    "wipedown",
    "wipetl",
    "wipetr",
    "wipebl",
    "wipebr",
  ]),
  duration: z.number().min(0).max(2).optional().default(0.3), // transition duration in seconds
});

export const mulmoMovieParamsSchema = z.object({
  provider: text2MovieProviderSchema.optional(),
  model: z.string().optional(),
  fillOption: mulmoFillOptionSchema.optional(), // for movie.ts
  transition: mulmoTransitionSchema.optional(), // for movie.ts
  filters: z.array(mulmoVideoFilterSchema).optional(), // for movie.ts
  vertexai_project: z.string().optional(), // Google Cloud Project ID for Vertex AI
  vertexai_location: z.string().optional(), // Vertex AI location (default: us-central1)
});

export const mulmoBeatSchema = z
  .object({
    speaker: speakerIdSchema.optional(),
    text: z.string().optional().default("").describe("Text to be spoken. If empty, the audio is not generated."),
    texts: z.array(z.string()).optional().describe("Manually split texts for captions. Takes precedence over text for caption display."),
    id: z.string().optional().describe("Unique identifier for the beat."),
    description: z.string().optional(),
    image: mulmoImageAssetSchema.optional(),
    audio: mulmoAudioAssetSchema.optional(),
    duration: z.number().optional().describe("Duration of the beat. Used only when the text is empty"),

    imageParams: mulmoBeatImageParamsSchema.optional(), // beat specific parameters
    audioParams: beatAudioParamsSchema.optional(), // beat specific parameters
    movieParams: mulmoMovieParamsSchema
      .extend({
        speed: z.number().optional().describe("Speed of the video. 1.0 is normal speed. 0.5 is half speed. 2.0 is double speed."), // for movie.ts
      })
      .optional(),
    soundEffectParams: mulmoSoundEffectParamsSchema.optional(),
    lipSyncParams: mulmoLipSyncParamsSchema.optional(),
    htmlImageParams: mulmoHtmlImageParamsSchema.optional(),
    speechOptions: speechOptionsSchema.optional(),
    textSlideParams: textSlideParamsSchema.optional(),
    captionParams: mulmoCaptionParamsSchema.optional(),
    imageNames: z.array(imageIdSchema).optional(), // list of image names to use for image generation. The default is all images in the imageParams.images.
    imagePrompt: z.string().optional(),
    moviePrompt: z.string().optional(),
    soundEffectPrompt: z.string().optional(),
    htmlPrompt: htmlPromptParamsSchema.optional(),
    enableLipSync: z.boolean().optional().describe("Enable lip sync generation for this beat"),
    hidden: z.boolean().optional().describe("Hide this beat from the presentation"),
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
    version: z.literal(currentMulmoScriptVersion),
    credit: z.literal("closing").optional(),
  })
  .strict();

export const text2HtmlImageProviderSchema = z.enum(htmlLLMProvider as [string, ...string[]]).default(defaultProviders.text2Html);

// NOTE: This is UI only. (until we figure out how to use it in movieParamsSchema)
export const mulmoGoogleMovieModelSchema = z
  .object({
    provider: z.literal("google"),
    model: z.enum(provider2MovieAgent.google.models as [string, ...string[]]).optional(),
  })
  .strict();

// NOTE: This is UI only. (until we figure out how to use it in movieParamsSchema)
export const mulmoReplicateMovieModelSchema = z
  .object({
    provider: z.literal("replicate"),
    model: z.enum(provider2MovieAgent.replicate.models as [string, ...string[]]).optional(),
  })
  .strict();

export const mulmoPresentationStyleSchema = z.object({
  $mulmocast: mulmoCastCreditSchema,
  canvasSize: mulmoCanvasDimensionSchema, // has default value
  speechParams: mulmoSpeechParamsSchema,
  imageParams: mulmoImageParamsSchema.optional().default({
    provider: defaultProviders.text2image,
    images: {},
  }),
  movieParams: mulmoMovieParamsSchema.optional().default({
    provider: defaultProviders.text2movie,
  }),
  soundEffectParams: mulmoSoundEffectParamsSchema.optional().default({
    provider: defaultProviders.soundEffect,
  }),
  lipSyncParams: mulmoLipSyncParamsSchema.optional(),
  htmlImageParams: mulmoHtmlImageParamsSchema
    .extend({
      provider: text2HtmlImageProviderSchema,
    })
    .optional(),
  // for textSlides
  textSlideParams: textSlideParamsSchema.optional(),
  // for slide plugin
  slideParams: mulmoSlideParamsSchema.optional(),
  captionParams: mulmoCaptionParamsSchema.optional(),
  audioParams: audioParamsSchema.default({
    introPadding: 1.0,
    padding: 0.3,
    closingPadding: 0.8,
    outroPadding: 1.0,
    bgmVolume: 0.2,
    audioVolume: 1.0,
    suppressSpeech: false,
  }),
});

export const mulmoReferenceSchema = z.object({
  url: URLStringSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  type: z
    .union([z.enum(["article", "paper", "image", "video", "audio"]), z.string()])
    .optional()
    .default("article"),
});

export const mulmoScriptSchema = mulmoPresentationStyleSchema
  .extend({
    title: z.string().optional(),
    description: z.string().optional(),
    references: z.array(mulmoReferenceSchema).optional(),
    lang: langSchema.optional().default("en"), // optional with default value "en"
    beats: z.array(mulmoBeatSchema).min(1),

    // TODO: Delete it later
    imagePath: z.string().optional(), // for keynote images movie ??

    // for debugging
    __test_invalid__: z.boolean().optional(),
  })
  .strict();

export const mulmoStudioBeatSchema = z
  .object({
    id: z.string().optional().describe("Unique identifier for the beat."),
    hash: z.string().optional(),
    duration: z.number().optional(),
    startAt: z.number().optional(),
    audioDuration: z.number().optional(),
    movieDuration: z.number().optional(),
    silenceDuration: z.number().optional(),
    hasMovieAudio: z.boolean().optional(),
    audioFile: z.string().optional(),
    imageFile: z.string().optional(), // path to the image
    movieFile: z.string().optional(), // path to the movie file
    soundEffectFile: z.string().optional(), // path to the sound effect file
    lipSyncFile: z.string().optional(), // path to the lip sync file
    captionFile: z.string().optional(), // path to the caption image (deprecated, use captionFiles)
    captionFiles: z
      .array(
        z.object({
          file: z.string(),
          startAt: z.number(), // absolute start time in seconds
          endAt: z.number(), // absolute end time in seconds
        }),
      )
      .optional(), // split caption images with timing
    htmlImageFile: z.string().optional(), // path to the html image
    markdown: z.string().optional(), // markdown string (alternative to image)
    html: z.string().optional(), // html string (alternative to image)
  })
  .strict();

export const mulmoStudioMultiLingualDataSchema = z.object({
  multiLingualTexts: multiLingualTextsSchema,
  cacheKey: z.string().optional(),
});

export const mulmoStudioMultiLingualArraySchema = z.array(mulmoStudioMultiLingualDataSchema).min(1);
export const mulmoStudioMultiLingualSchema = z.record(z.string(), mulmoStudioMultiLingualDataSchema);
export const mulmoStudioMultiLingualFileSchema = z.object({
  version: z.literal(currentMulmoScriptVersion),
  multiLingual: mulmoStudioMultiLingualSchema,
});

export const mulmoSessionStateSchema = z.object({
  inSession: z.object({
    audio: z.boolean(),
    image: z.boolean(),
    video: z.boolean(),
    multiLingual: z.boolean(),
    caption: z.boolean(),
    pdf: z.boolean(),
    markdown: z.boolean(),
    html: z.boolean(),
  }),
  inBeatSession: z.object({
    audio: z.record(z.string(), z.boolean()),
    image: z.record(z.string(), z.boolean()),
    movie: z.record(z.string(), z.boolean()),
    multiLingual: z.record(z.string(), z.boolean()),
    caption: z.record(z.string(), z.boolean()),
    html: z.record(z.string(), z.boolean()),
    imageReference: z.record(z.string(), z.boolean()),
    soundEffect: z.record(z.string(), z.boolean()),
    lipSync: z.record(z.string(), z.boolean()),
  }),
});

export const mulmoStudioSchema = z
  .object({
    script: mulmoScriptSchema,
    filename: z.string(),
    beats: z.array(mulmoStudioBeatSchema).min(1),
  })
  .strict();

export const mulmoPromptTemplateSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    scriptName: z.string().optional(),
    presentationStyle: mulmoPresentationStyleSchema.optional(),
  })
  .strict();

export const mulmoPromptTemplateFileSchema = mulmoPromptTemplateSchema.extend({
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

export const urlsSchema = z.array(z.url({ message: "Invalid URL format" }));
