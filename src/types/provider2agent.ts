// node & browser

export const provider2TTSAgent = {
  openai: {
    agentName: "ttsOpenaiAgent",
    hasLimitedConcurrency: false,
    defaultModel: "gpt-4o-mini-tts",
    defaultVoice: "shimmer",
    keyName: "OPENAI_API_KEY",
    baseURLKeyName: "OPENAI_BASE_URL",
  },
  google: {
    agentName: "ttsGoogleAgent",
    hasLimitedConcurrency: false,
    keyName: "GEMINI_API_KEY",
  },
  gemini: {
    agentName: "ttsGeminiAgent",
    hasLimitedConcurrency: false,
    // The 2.5 preview TTS models shut down on 2026-11-17; Google names gemini-3.8-flash-tts as their successor.
    defaultModel: "gemini-3.8-flash-tts",
    defaultVoice: "Kore",
    models: ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"],
    keyName: "GEMINI_API_KEY",
  },
  elevenlabs: {
    agentName: "ttsElevenlabsAgent",
    hasLimitedConcurrency: true,
    defaultModel: "eleven_multilingual_v2",
    // Models | ElevenLabs Documentation
    // https://elevenlabs.io/docs/models
    models: ["eleven_v3", "eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_flash_v2_5", "eleven_flash_v2"],
    keyName: "ELEVENLABS_API_KEY",
  },
  kotodama: {
    agentName: "ttsKotodamaAgent",
    hasLimitedConcurrency: true,
    defaultVoice: "Atla",
    defaultDecoration: "neutral",
    keyName: "KOTODAMA_API_KEY",
  },
  mock: {
    agentName: "mediaMockAgent",
    hasLimitedConcurrency: true,
    defaultModel: "mock-model",
    models: ["mock-model"],
  },
};

export const gptImages = ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2", "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"];

// The 2.5 models render "auto" (their default) at "low", where gpt-image-1 rendered it at "high".
export const isGptImage25Model = (model: string): boolean => model.startsWith("gpt-image-2.5");

// An unset quality on 2.5 is sent as "high" to keep the look scripts had before the default model changed;
// an explicit "auto" is the script's choice and is sent as is.
export const gptImageQuality = <Quality extends string>(model: string, quality?: Quality): Quality | "high" | undefined =>
  quality ?? (isGptImage25Model(model) ? "high" : undefined);

const supportedOpenAIImageReplacementHint = "Use 'gpt-image-2.5-sunburst' or another supported model.";

export const deprecatedOpenAIImageModelHints = {
  "dall-e-2": supportedOpenAIImageReplacementHint,
  "dall-e-3": supportedOpenAIImageReplacementHint,
} as const satisfies Record<string, string>;

export type DeprecatedOpenAIImageModel = keyof typeof deprecatedOpenAIImageModelHints;

const supportedGoogleImageReplacementHint = "Use 'gemini-3.1-flash-lite-image' or 'gemini-3-pro-image' instead.";

export const deprecatedGoogleImageModelHints = {
  "imagen-3.0-generate-002": supportedGoogleImageReplacementHint,
  "imagen-4.0-generate-001": supportedGoogleImageReplacementHint,
  "imagen-4.0-ultra-generate-001": supportedGoogleImageReplacementHint,
  "imagen-4.0-fast-generate-001": supportedGoogleImageReplacementHint,
  "imagen-4.0-generate-preview-06-06": supportedGoogleImageReplacementHint,
  "imagen-4.0-ultra-generate-preview-06-06": supportedGoogleImageReplacementHint,
} as const satisfies Record<string, string>;

export type DeprecatedGoogleImageModel = keyof typeof deprecatedGoogleImageModelHints;

// Gemini image models are called through generateContent; anything else is treated as an Imagen model (generateImages).
export const isGeminiImageModel = (model: string): boolean => model.startsWith("gemini-");

// Google image models that on Vertex AI are only published under location "global"
// (regional endpoints like us-central1 return 404 NOT_FOUND).
// See https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image
// and https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-1-flash-image
export const vertexAIGlobalOnlyImageModels: ReadonlySet<string> = new Set([
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
]);

const VERTEX_DEFAULT_IMAGE_LOCATION = "us-central1";

// A global-only model has no regional endpoint, so an omitted location means "global" for it.
export const vertexImageLocation = (model: string, location?: string): string =>
  location ?? (vertexAIGlobalOnlyImageModels.has(model) ? "global" : VERTEX_DEFAULT_IMAGE_LOCATION);

// Per-model reference image limits (image_input array). Only verified entries; unlisted models are not truncated.
const replicateImageModelParams: Record<string, { maxReferenceImages?: number }> = {
  "bytedance/seedream-4": { maxReferenceImages: 10 },
};

export const provider2ImageAgent = {
  openai: {
    agentName: "imageOpenaiAgent",
    // gpt-image-1 shuts down on 2026-10-23; OpenAI names gpt-image-2.5-sunburst or -flare as its successor.
    // https://developers.openai.com/api/docs/deprecations
    defaultModel: "gpt-image-2.5-sunburst",
    models: [...gptImages],
    keyName: "OPENAI_API_KEY",
    baseURLKeyName: "OPENAI_BASE_URL",
    maxReferenceImages: 16, // images.edit accepts up to 16 input images
  },
  google: {
    agentName: "imageGenAIAgent",
    // gemini-2.5-flash-image is deprecated; Google names gemini-3.1-flash-lite-image as its successor.
    defaultModel: "gemini-3.1-flash-lite-image",
    models: [
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-image",
      "gemini-3-pro-image",
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image-preview",
    ],
    keyName: "GEMINI_API_KEY",
  },
  replicate: {
    agentName: "imageReplicateAgent",
    defaultModel: "bytedance/seedream-4",
    imageModelParams: replicateImageModelParams,
    models: [
      "bytedance/seedream-4",
      "qwen/qwen-image",
      "black-forest-labs/flux-2-pro",
      "black-forest-labs/flux-2-dev",
      "black-forest-labs/flux-1.1-pro",
      "black-forest-labs/flux-1.1-pro-ultra",
      "black-forest-labs/flux-pro",
      "black-forest-labs/flux-dev",
      "black-forest-labs/flux-schnell",
      "ideogram-ai/ideogram-v3-turbo",
      "ideogram-ai/ideogram-v3-balanced",
      "ideogram-ai/ideogram-v3-quality",
      "recraft-ai/recraft-v3",
      "stability-ai/stable-diffusion-3.5-large",
      "luma/photon",
    ],
    keyName: "REPLICATE_API_TOKEN",
  },
  mock: {
    agentName: "mediaMockAgent",
    defaultModel: "mock-model",
    models: ["mock-model"],
    keyName: "",
  },
};

export type ReplicateModel = `${string}/${string}`;
export const AUDIO_MODE_NEVER = "never" as const;
export const AUDIO_MODE_ALWAYS = "always" as const;
export const AUDIO_MODE_OPTIONAL = "optional" as const;
export type MovieAudioSpec = { mode: typeof AUDIO_MODE_NEVER } | { mode: typeof AUDIO_MODE_ALWAYS } | { mode: typeof AUDIO_MODE_OPTIONAL; param: string };
type ReplicateMovieModelParams = {
  durations: number[];
  start_image: string | undefined;
  start_image_required?: boolean;
  last_image?: string;
  reference_images_param?: string;
  audio: MovieAudioSpec;
  price_per_sec: number;
};
type GoogleMovieModelParams = {
  durations: number[];
  supportsDuration: boolean;
  supportsLastFrame: boolean;
  supportsReferenceImages: boolean;
  supportsPersonGeneration: boolean;
  audio: MovieAudioSpec;
};

export const provider2MovieAgent = {
  replicate: {
    agentName: "movieReplicateAgent",
    defaultModel: "bytedance/seedance-1-lite" as ReplicateModel,
    keyName: "REPLICATE_API_TOKEN",
    models: [
      "bytedance/seedance-1-lite",
      "bytedance/seedance-1-pro",
      "bytedance/seedance-2.0",
      "bytedance/seedance-2.0-fast",
      "kwaivgi/kling-v2.1",
      "kwaivgi/kling-v2.1-master",
      "google/veo-2",
      "google/veo-3",
      "google/veo-3.1",
      "google/veo-3.1-fast",
      "google/veo-3.1-lite",
      "google/veo-3-fast",
      "minimax/video-01",
      "minimax/hailuo-02",
      "minimax/hailuo-02-fast",
      "pixverse/pixverse-v4.5",
      "wan-video/wan-2.2-i2v-fast",
      "wan-video/wan-2.2-t2v-fast",
      "xai/grok-imagine-video",
      "xai/grok-imagine-r2v",
      "runwayml/gen-4.5",
      "kwaivgi/kling-v3-omni-video",
      "kwaivgi/kling-v3-video",
      "alibaba/happyhorse-1.0",
      "minimax/hailuo-2.3",
      "minimax/hailuo-2.3-fast",
      "pixverse/pixverse-v5",
      "prunaai/p-video",
      "xai/grok-imagine-video-1.5",
    ],
    modelParams: {
      "bytedance/seedance-1-lite": {
        durations: [4, 5, 6, 7, 8, 9, 10, 11, 12],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.036, // in USD
      },
      "bytedance/seedance-1-pro": {
        durations: [5, 10],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.15,
      },
      "bytedance/seedance-2.0": {
        durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.18,
      },
      "bytedance/seedance-2.0-fast": {
        durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.15,
      },
      "kwaivgi/kling-v2.1": {
        durations: [5, 10],
        start_image: "start_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.05,
      },
      "kwaivgi/kling-v2.1-master": {
        durations: [5, 10],
        start_image: "start_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.28,
      },
      "google/veo-2": {
        durations: [5, 6, 7, 8],
        start_image: "image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.5,
      },
      "google/veo-3": {
        durations: [8],
        start_image: "image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.2,
      },
      "google/veo-3.1": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame_image",
        reference_images_param: "reference_images",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.2,
      },
      "google/veo-3.1-fast": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.1,
      },
      "google/veo-3.1-lite": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.05,
      },
      "google/veo-3-fast": {
        durations: [8],
        start_image: "image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.1,
      },
      "minimax/video-01": {
        durations: [6],
        start_image: "first_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.083,
      },
      "minimax/hailuo-02": {
        durations: [6], // NOTE: 10 for only 720p
        start_image: "first_frame_image",
        last_image: "end_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.08,
      },
      "minimax/hailuo-02-fast": {
        durations: [6, 10], // NOTE: 512P
        start_image: "first_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.0166,
      },
      "pixverse/pixverse-v4.5": {
        durations: [5, 8],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "sound_effect_switch" },
        price_per_sec: 0.06,
      },
      "wan-video/wan-2.2-i2v-fast": {
        // No duration input: length is num_frames (default 81) / frames_per_second (default 16) ≈ 5s.
        durations: [5],
        start_image: "image",
        start_image_required: true,
        last_image: "last_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.01, // $0.05 per 81-frame 480p video; up to $0.145 at 720p
      },
      "wan-video/wan-2.2-t2v-fast": {
        durations: [5],
        start_image: undefined,
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.01,
      },
      "xai/grok-imagine-video": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.05,
      },
      "xai/grok-imagine-r2v": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        start_image: undefined,
        reference_images_param: "reference_images",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.05,
      },
      "runwayml/gen-4.5": {
        durations: [5, 10],
        start_image: "image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.12,
      },
      "kwaivgi/kling-v3-omni-video": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "start_image",
        last_image: "end_image",
        reference_images_param: "reference_images",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.224,
      },
      "kwaivgi/kling-v3-video": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "start_image",
        last_image: "end_image",
        reference_images_param: "reference_images",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "generate_audio" },
        price_per_sec: 0.224,
      },
      // TODO: price_per_sec for the models below is a coarse approximation.
      // Actual Replicate pricing varies by resolution / duration / quality and
      // cannot be expressed as a single per-second number. Verify each model at
      // https://replicate.com/<owner>/<model> when this field starts being consumed.
      "alibaba/happyhorse-1.0": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.14,
      },
      "minimax/hailuo-2.3": {
        durations: [6, 10],
        start_image: "first_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.047,
      },
      "minimax/hailuo-2.3-fast": {
        durations: [6, 10],
        start_image: "first_frame_image",
        start_image_required: true,
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.032,
      },
      "pixverse/pixverse-v5": {
        durations: [5, 8],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_NEVER },
        price_per_sec: 0.06,
      },
      "prunaai/p-video": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: AUDIO_MODE_OPTIONAL, param: "save_audio" },
        price_per_sec: 0.02, // 720p, draft mode off ($0.04 at 1080p)
      },
      "xai/grok-imagine-video-1.5": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        start_image_required: true,
        audio: { mode: AUDIO_MODE_ALWAYS },
        price_per_sec: 0.08,
      },
    } as Record<ReplicateModel, ReplicateMovieModelParams>,
  },
  google: {
    agentName: "movieGenAIAgent",
    // The Veo 3.1 previews shut down on 2026-10-22; Gemini Omni is their successor on the Gemini API.
    defaultModel: "gemini-omni-1.1-flash",
    models: ["gemini-omni-1.1-flash", "veo-3.1-generate-001"],
    keyName: "GEMINI_API_KEY",
    modelParams: {
      // Gemini API only. Longer beats are extended, up to 40 seconds (see gemini_omni_video.ts).
      "gemini-omni-1.1-flash": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10],
        supportsDuration: true,
        supportsLastFrame: true,
        supportsReferenceImages: false,
        supportsPersonGeneration: false,
        audio: { mode: AUDIO_MODE_ALWAYS },
      },
      // Vertex AI only: the GA name of Veo 3.1 there.
      "veo-3.1-generate-001": {
        durations: [4, 6, 8],
        supportsDuration: true,
        supportsLastFrame: true,
        supportsReferenceImages: true,
        supportsPersonGeneration: false,
        audio: { mode: AUDIO_MODE_ALWAYS },
      },
    } as Record<string, GoogleMovieModelParams>,
  },
  mock: {
    agentName: "mediaMockAgent",
    defaultModel: "mock-model",
    models: ["mock-model"],
    keyName: "",
    modelParams: {},
  },
};

export const provider2SoundEffectAgent = {
  replicate: {
    agentName: "soundEffectReplicateAgent",
    defaultModel: "zsxkib/mmaudio" as ReplicateModel,
    keyName: "REPLICATE_API_TOKEN",
    models: ["zsxkib/mmaudio"] as ReplicateModel[],
    modelParams: {
      "zsxkib/mmaudio": {
        identifier: "zsxkib/mmaudio:62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484",
      },
    } as Record<ReplicateModel, { identifier?: `${string}/${string}:${string}` }>,
  },
};

export const provider2LipSyncAgent = {
  replicate: {
    agentName: "lipSyncReplicateAgent",
    defaultModel: "bytedance/omni-human" as ReplicateModel,
    keyName: "REPLICATE_API_TOKEN",
    models: ["bytedance/latentsync", "tmappdev/lipsync", "bytedance/omni-human", "pixverse/lipsync"] as ReplicateModel[],
    modelParams: {
      "bytedance/latentsync": {
        identifier: "bytedance/latentsync:637ce1919f807ca20da3a448ddc2743535d2853649574cd52a933120e9b9e293",
        video: "video",
        audio: "audio",
      },
      "tmappdev/lipsync": {
        identifier: "tmappdev/lipsync:c54ce2fe673ea59b857b91250b3d71a2cd304a78f2370687632805c8405fbf4c",
        video: "video_input",
        audio: "audio_input",
      },
      "bytedance/omni-human": {
        identifier: "bytedance/omni-human",
        image: "image",
        audio: "audio",
        price_per_sec: 0.14,
      },
      "pixverse/lipsync": {
        identifier: "pixverse/lipsync:3ca6d73f4fb9e1d77a4b6e14f8998ee18926e4dc462838e31fa2bb5e662c1e2c",
        video: "video",
        audio: "audio",
      },
      /* NOTE: This model does not work with large base64 urls.
      "sync/lipsync-2": {
        video: "video",
        audio: "audio",
      },
      */
      /* NOTE: This model does not work with base64 data URIs (error 1201).
      "kwaivgi/kling-lip-sync": {
        identifier: "kwaivgi/kling-lip-sync:8311467f07043d4b3feb44584d2586bfa2fc70203eca612ed26f84d0b55df3ce",
        video: "video_url",
        audio: "audio_file",
      },
      */
    } as Record<
      ReplicateModel,
      { identifier?: `${string}/${string}:${string}` | `${string}/${string}`; video?: string; audio: string; image?: string; price_per_sec?: number }
    >,
  },
};

// : Record<LLM, { agent: string; defaultModel: string; max_tokens: number }>
export const provider2LLMAgent = {
  openai: {
    agentName: "openAIAgent",
    // gpt-5 (gpt-5-2025-08-07) shuts down on 2026-12-11; OpenAI names gpt-5.6-sol as its successor.
    defaultModel: "gpt-5.6-sol",
    keyName: "OPENAI_API_KEY",
    baseURLKeyName: "OPENAI_BASE_URL",
    apiVersionKeyName: "OPENAI_API_VERSION",
    max_tokens: 8192,
    models: [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5",
      "gpt-5-nano",
      "gpt-5-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o3",
      "o3-mini",
      "o3-pro",
      "o1",
      "o1-pro",
      "gpt-4o",
      "gpt-4o-mini",
    ],
  },
  anthropic: {
    agentName: "anthropicAgent",
    // claude-sonnet-4-5 retires on 2026-11-30. Its named successor, claude-sonnet-5-5 (like claude-opus-4-8),
    // rejects the temperature @graphai/anthropic_agent always sends, so the newest model that answers is used.
    defaultModel: "claude-sonnet-4-6",
    max_tokens: 8192,
    models: ["claude-sonnet-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    keyName: "ANTHROPIC_API_KEY",
    apiKeyNameOverride: "ANTHROPIC_API_TOKEN",
    // GraphAI is currently using ANTHROPIC_API_KEY, but the official name is ANTHROPIC_API_TOKEN.
  },
  gemini: {
    agentName: "geminiAgent",
    // Google limits the 2.5 models to users who have used them before and recommends 3.8 Flash.
    defaultModel: "gemini-3.8-flash",
    max_tokens: 8192,
    models: ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
    keyName: "GEMINI_API_KEY",
  },
  groq: {
    agentName: "groqAgent",
    // The Llama and DeepSeek models were shut down; Groq names openai/gpt-oss-20b as the 8B model's successor.
    // https://console.groq.com/docs/deprecations
    defaultModel: "openai/gpt-oss-20b",
    keyName: "GROQ_API_KEY",
    max_tokens: 4096,
    models: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"],
  },
  mock: {
    agentName: "mediaMockAgent",
    defaultModel: "mock",
    max_tokens: 4096,
    models: ["mock"],
  },
} as const;

export const defaultProviders: {
  tts: keyof typeof provider2TTSAgent;
  text2image: keyof typeof provider2ImageAgent;
  text2movie: keyof typeof provider2MovieAgent;
  text2Html: keyof typeof provider2LLMAgent;
  llm: keyof typeof provider2LLMAgent;
  soundEffect: keyof typeof provider2SoundEffectAgent;
  lipSync: keyof typeof provider2LipSyncAgent;
} = {
  tts: "openai",
  text2image: "openai",
  text2movie: "replicate",
  text2Html: "openai",
  llm: "openai",
  soundEffect: "replicate",
  lipSync: "replicate",
};

export const llm = Object.keys(provider2LLMAgent) as (keyof typeof provider2LLMAgent)[];
export type LLM = keyof typeof provider2LLMAgent;

export const htmlLLMProvider = ["openai", "anthropic", "mock"];

// Provider name literals. Compare via these identifiers (e.g. provider === ProviderName.Replicate)
// instead of raw strings.
export const ProviderName = {
  OpenAI: "openai",
  Google: "google",
  Gemini: "gemini",
  Anthropic: "anthropic",
  Replicate: "replicate",
  ElevenLabs: "elevenlabs",
  Mock: "mock",
} as const;

export const isImageProvider = (provider: string | undefined): provider is keyof typeof provider2ImageAgent => {
  return provider !== undefined && provider in provider2ImageAgent;
};

// Max reference images an image model accepts as input; undefined means no known limit (no truncation).
export const getMaxImageReferenceImages = (provider: string | undefined, model: string): number | undefined => {
  if (!isImageProvider(provider)) {
    return undefined;
  }
  if (provider === ProviderName.Replicate) {
    return provider2ImageAgent.replicate.imageModelParams[model]?.maxReferenceImages;
  }
  const agentInfo = provider2ImageAgent[provider];
  return "maxReferenceImages" in agentInfo ? agentInfo.maxReferenceImages : undefined;
};

export const getModelAudio = (provider: keyof typeof provider2MovieAgent, model: string): MovieAudioSpec | undefined => {
  const modelParams = provider2MovieAgent[provider]?.modelParams as Record<string, { audio?: MovieAudioSpec }>;
  return modelParams?.[model]?.audio;
};

const GOOGLE_VERTEX_DEFAULT_MOVIE_MODEL = "veo-3.1-generate-001";

const removedGoogleMovieModelHint =
  "It shut down on 2026-10-22. Use 'gemini-omni-1.1-flash' on the Gemini API, or 'veo-3.1-generate-001' with movieParams.vertexai_project on Vertex AI (needed for referenceImages).";

const removedGoogleMovieModelHints: Record<string, string> = {
  "veo-3.1-generate-preview": removedGoogleMovieModelHint,
  "veo-3.1-lite-generate-preview": removedGoogleMovieModelHint,
};

// An unknown model fails here with a hint, not with a TypeError in the duration lookup.
export const unsupportedGoogleMovieModelMessage = (model: string): string | null => {
  if (Object.hasOwn(provider2MovieAgent.google.modelParams, model)) return null;
  const hint = Object.hasOwn(removedGoogleMovieModelHints, model)
    ? removedGoogleMovieModelHints[model]
    : `Supported models: ${provider2MovieAgent.google.models.join(", ")}.`;
  return `Google movie model "${model}" is not supported. ${hint}`;
};

// Gemini Omni is a Gemini API model here, so Vertex AI keeps Veo 3.1 as its default.
export const defaultMovieModel = (provider: keyof typeof provider2MovieAgent, movieParams?: { vertexai_project?: string }): string =>
  provider === "google" && movieParams?.vertexai_project ? GOOGLE_VERTEX_DEFAULT_MOVIE_MODEL : provider2MovieAgent[provider].defaultModel;

export const getModelDuration = (provider: keyof typeof provider2MovieAgent, model: string, movieDuration?: number) => {
  const modelParams = provider2MovieAgent[provider]?.modelParams as Record<string, { durations?: number[] }>;
  if (!modelParams || !Object.hasOwn(modelParams, model)) return undefined;
  const { durations } = modelParams[model];
  if (durations && movieDuration) {
    const largerDurations = durations.filter((d: number) => d >= movieDuration);
    return largerDurations.length > 0 ? largerDurations[0] : durations[durations.length - 1];
  }
  return durations?.[0];
};

// ---- Pricing metadata (for pre-run usage estimation and cost reporting) ----
// Prices drift over time; every entry records the date it was last verified
// against the provider's official pricing page (asOf, YYYY-MM-DD).

export type ModelPricing = {
  unit: "tokens" | "chars" | "seconds" | "images";
  inputPerMTokensUSD?: number;
  outputPerMTokensUSD?: number;
  perMCharsUSD?: number;
  perSecUSD?: number;
  perImageUSD?: number;
  asOf: string;
};

// gpt-image-1 / gpt-image-1-mini emit a fixed number of image output tokens per size × quality.
// Later gpt-image models (1.5 / 2) use variable resolutions, so this table is only an approximation for them.
// Source: https://developers.openai.com/api/docs/guides/image-generation (verified 2026-07-03)
export const gptImageOutputTokens: Record<string, { low: number; medium: number; high: number }> = {
  "1024x1024": { low: 272, medium: 1056, high: 4160 },
  "1024x1536": { low: 408, medium: 1584, high: 6240 },
  "1536x1024": { low: 400, medium: 1568, high: 6208 },
};

// Spot-checked against replicate.com model pages on this date (seedance-1-lite, kling-v2.1, omni-human).
// Some replicate prices vary by resolution/variant; price_per_sec holds the rate for the typical configuration
// (e.g. seedance-1-lite at 720p, kling-v2.1 standard).
// Optional-audio models are priced without audio, since mulmocast generates them silent by default.
const REPLICATE_PRICING_AS_OF = "2026-10-07";

const replicateMoviePricing: Record<string, ModelPricing> = Object.fromEntries(
  Object.entries(provider2MovieAgent.replicate.modelParams).map(([model, params]) => [
    model,
    { unit: "seconds", perSecUSD: params.price_per_sec, asOf: REPLICATE_PRICING_AS_OF },
  ]),
);

const replicateLipSyncPricing: Record<string, ModelPricing> = Object.fromEntries(
  Object.entries(provider2LipSyncAgent.replicate.modelParams)
    .filter(([, params]) => params.price_per_sec !== undefined)
    .map(([model, params]) => [model, { unit: "seconds", perSecUSD: params.price_per_sec, asOf: REPLICATE_PRICING_AS_OF }]),
);

export const modelPricing: Record<string, Record<string, ModelPricing>> = {
  openai: {
    // https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
    "gpt-4o-mini-tts": { unit: "tokens", inputPerMTokensUSD: 0.6, outputPerMTokensUSD: 12, asOf: "2026-07-03" },
    "tts-1": { unit: "chars", perMCharsUSD: 15, asOf: "2026-07-03" },
    "tts-1-hd": { unit: "chars", perMCharsUSD: 30, asOf: "2026-07-03" },
    // https://developers.openai.com/api/docs/models/gpt-image-1 (image input tokens, $10/1M, are not modeled)
    "gpt-image-1": { unit: "tokens", inputPerMTokensUSD: 5, outputPerMTokensUSD: 40, asOf: "2026-07-03" },
    "gpt-image-1.5": { unit: "tokens", inputPerMTokensUSD: 5, outputPerMTokensUSD: 32, asOf: "2026-07-03" },
    "gpt-image-2": { unit: "tokens", inputPerMTokensUSD: 5, outputPerMTokensUSD: 30, asOf: "2026-07-03" },
    "gpt-image-1-mini": { unit: "tokens", inputPerMTokensUSD: 2, outputPerMTokensUSD: 8, asOf: "2026-07-03" },
    // https://developers.openai.com/api/docs/pricing (text input $5/1M, image output $30/1M; image input $8/1M is not modeled)
    "gpt-image-2.5-sunburst": { unit: "tokens", inputPerMTokensUSD: 5, outputPerMTokensUSD: 30, asOf: "2026-10-07" },
    "gpt-image-2.5-flare": { unit: "tokens", inputPerMTokensUSD: 5, outputPerMTokensUSD: 30, asOf: "2026-10-07" },
    // https://developers.openai.com/api/docs/models/gpt-5 etc.
    "gpt-5": { unit: "tokens", inputPerMTokensUSD: 1.25, outputPerMTokensUSD: 10, asOf: "2026-07-03" },
    "gpt-5-mini": { unit: "tokens", inputPerMTokensUSD: 0.25, outputPerMTokensUSD: 2, asOf: "2026-07-03" },
    // https://developers.openai.com/api/docs/models/gpt-5.6-sol (promotional price, "at least through November 21, 2026")
    "gpt-5.6-sol": { unit: "tokens", inputPerMTokensUSD: 4, outputPerMTokensUSD: 20, asOf: "2026-10-07" },
    "gpt-5.6-terra": { unit: "tokens", inputPerMTokensUSD: 2, outputPerMTokensUSD: 12, asOf: "2026-10-07" },
    "gpt-4o": { unit: "tokens", inputPerMTokensUSD: 2.5, outputPerMTokensUSD: 10, asOf: "2026-07-03" },
  },
  gemini: {
    // https://ai.google.dev/gemini-api/docs/pricing
    "gemini-2.5-flash-preview-tts": { unit: "tokens", inputPerMTokensUSD: 0.5, outputPerMTokensUSD: 10, asOf: "2026-07-03" },
    "gemini-2.5-pro-preview-tts": { unit: "tokens", inputPerMTokensUSD: 1, outputPerMTokensUSD: 20, asOf: "2026-07-03" },
    // through 2026-12-31; $1 / $18 (flash) and $1 / $12 (lite) from 2027-01-01
    "gemini-3.8-flash-tts": { unit: "tokens", inputPerMTokensUSD: 0.5, outputPerMTokensUSD: 9, asOf: "2026-10-07" },
    "gemini-3.8-flash-lite-tts": { unit: "tokens", inputPerMTokensUSD: 0.5, outputPerMTokensUSD: 6, asOf: "2026-10-07" },
  },
  google: {
    // https://ai.google.dev/gemini-api/docs/pricing ($0.039/image ≒ 1290 output tokens at $30/1M)
    "gemini-2.5-flash-image": { unit: "images", inputPerMTokensUSD: 0.3, perImageUSD: 0.039, asOf: "2026-07-03" },
    // $0.0336 per 1K-resolution image
    "gemini-3.1-flash-lite-image": { unit: "images", inputPerMTokensUSD: 0.25, perImageUSD: 0.0336, asOf: "2026-10-07" },
    // Video per generated second at 720p. Shut-down models (veo-2.0, veo-3.0, the Veo 3.1 previews) intentionally have no price.
    // Gemini Omni bills video output tokens at $17.50/1M, 5,792 tokens per second of 720p video.
    "gemini-omni-1.1-flash": { unit: "seconds", perSecUSD: 0.1014, asOf: "2026-10-07" },
    // Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/pricing (video + audio, 720p/1080p)
    "veo-3.1-generate-001": { unit: "seconds", perSecUSD: 0.4, asOf: "2026-10-07" },
    // Google Cloud Text-to-Speech per 1M characters, keyed by voice tier.
    // https://cloud.google.com/text-to-speech/pricing
    "tts-standard": { unit: "chars", perMCharsUSD: 4, asOf: "2026-07-03" },
    "tts-wavenet": { unit: "chars", perMCharsUSD: 4, asOf: "2026-07-03" },
    "tts-neural2": { unit: "chars", perMCharsUSD: 16, asOf: "2026-07-03" },
    "tts-chirp3-hd": { unit: "chars", perMCharsUSD: 30, asOf: "2026-07-03" },
    "tts-studio": { unit: "chars", perMCharsUSD: 160, asOf: "2026-07-03" },
  },
  anthropic: {
    // https://platform.claude.com/docs/en/docs/about-claude/pricing
    "claude-sonnet-4-5-20250929": { unit: "tokens", inputPerMTokensUSD: 3, outputPerMTokensUSD: 15, asOf: "2026-07-03" },
    "claude-sonnet-4-6": { unit: "tokens", inputPerMTokensUSD: 3, outputPerMTokensUSD: 15, asOf: "2026-10-07" },
  },
  elevenlabs: {
    // https://elevenlabs.io/pricing/api ($0.08 per 1k chars for multilingual/v3, $0.04 for flash/turbo)
    eleven_v3: { unit: "chars", perMCharsUSD: 80, asOf: "2026-10-07" },
    eleven_multilingual_v2: { unit: "chars", perMCharsUSD: 80, asOf: "2026-10-07" },
    eleven_turbo_v2_5: { unit: "chars", perMCharsUSD: 40, asOf: "2026-10-07" },
    eleven_turbo_v2: { unit: "chars", perMCharsUSD: 40, asOf: "2026-10-07" },
    eleven_flash_v2_5: { unit: "chars", perMCharsUSD: 40, asOf: "2026-10-07" },
    eleven_flash_v2: { unit: "chars", perMCharsUSD: 40, asOf: "2026-10-07" },
  },
  replicate: {
    ...replicateMoviePricing,
    ...replicateLipSyncPricing,
    // https://replicate.com/bytedance/seedream-4 ($0.03 per output image)
    // zsxkib/mmaudio is intentionally unpriced: it bills by GPU time (~$0.005 per run), not by clip duration.
    "bytedance/seedream-4": { unit: "images", perImageUSD: 0.03, asOf: "2026-07-03" },
  },
};

export const getModelPricing = (provider: string, model: string): ModelPricing | undefined => {
  return modelPricing[provider]?.[model];
};
