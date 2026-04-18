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
    defaultModel: "gemini-2.5-flash-preview-tts",
    defaultVoice: "Kore",
    models: ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"],
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

export const gptImages = ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"];

export const provider2ImageAgent = {
  openai: {
    agentName: "imageOpenaiAgent",
    defaultModel: "gpt-image-1",
    models: ["dall-e-3", ...gptImages],
    keyName: "OPENAI_API_KEY",
    baseURLKeyName: "OPENAI_BASE_URL",
  },
  google: {
    agentName: "imageGenAIAgent",
    defaultModel: "gemini-2.5-flash-image",
    models: [
      "imagen-4.0-generate-001",
      "imagen-4.0-ultra-generate-001",
      "imagen-4.0-fast-generate-001",
      "gemini-2.5-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image-preview",
    ],
    keyName: "GEMINI_API_KEY",
  },
  replicate: {
    agentName: "imageReplicateAgent",
    defaultModel: "bytedance/seedream-4",
    models: ["bytedance/seedream-4", "qwen/qwen-image"],
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
type MovieAudioSpec = { mode: "never" } | { mode: "always" } | { mode: "optional"; param: string };
type ReplicateMovieModelParams = {
  durations: number[];
  start_image: string | undefined;
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
      "kwaivgi/kling-v1.6-pro",
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
    ],
    modelParams: {
      "bytedance/seedance-1-lite": {
        durations: [5, 10],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "never" },
        price_per_sec: 0.036, // in USD
      },
      "bytedance/seedance-1-pro": {
        durations: [5, 10],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "never" },
        price_per_sec: 0.15,
      },
      "bytedance/seedance-2.0": {
        durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.29,
      },
      "bytedance/seedance-2.0-fast": {
        durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.22,
      },
      "kwaivgi/kling-v1.6-pro": {
        durations: [5, 10],
        start_image: "start_image",
        audio: { mode: "never" },
        price_per_sec: 0.095,
      },
      "kwaivgi/kling-v2.1": {
        durations: [5, 10],
        start_image: "start_image",
        audio: { mode: "never" },
        price_per_sec: 0.05,
      },
      "kwaivgi/kling-v2.1-master": {
        durations: [5, 10],
        start_image: "start_image",
        audio: { mode: "never" },
        price_per_sec: 0.28,
      },
      "google/veo-2": {
        durations: [5, 6, 7, 8],
        start_image: "image",
        audio: { mode: "never" },
        price_per_sec: 0.5,
      },
      "google/veo-3": {
        durations: [8],
        start_image: "image",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.75,
      },
      "google/veo-3.1": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame_image",
        reference_images_param: "reference_images",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.75,
      },
      "google/veo-3.1-fast": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.4,
      },
      "google/veo-3.1-lite": {
        durations: [4, 6, 8],
        start_image: "image",
        last_image: "last_frame",
        audio: { mode: "never" },
        price_per_sec: 0.05,
      },
      "google/veo-3-fast": {
        durations: [8],
        start_image: "image",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.4,
      },
      "minimax/video-01": {
        durations: [6],
        start_image: "first_frame_image",
        audio: { mode: "never" },
        price_per_sec: 0.5,
      },
      "minimax/hailuo-02": {
        durations: [6], // NOTE: 10 for only 720p
        start_image: "first_frame_image",
        last_image: "end_image",
        audio: { mode: "never" },
        price_per_sec: 0.08,
      },
      "minimax/hailuo-02-fast": {
        durations: [6, 10], // NOTE: 512P
        start_image: "first_frame_image",
        audio: { mode: "never" },
        price_per_sec: 0.0166,
      },
      "pixverse/pixverse-v4.5": {
        durations: [5, 8],
        start_image: "image",
        last_image: "last_frame_image",
        audio: { mode: "optional", param: "sound_effect_switch" },
        price_per_sec: 0.12,
      },
      "wan-video/wan-2.2-i2v-fast": {
        durations: [5],
        start_image: "image",
        audio: { mode: "never" },
        price_per_sec: 0.012,
      },
      "wan-video/wan-2.2-t2v-fast": {
        durations: [5],
        start_image: undefined,
        audio: { mode: "never" },
        price_per_sec: 0.012,
      },
      "xai/grok-imagine-video": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "image",
        audio: { mode: "never" },
        price_per_sec: 0.08,
      },
      "xai/grok-imagine-r2v": {
        durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        start_image: undefined,
        reference_images_param: "reference_images",
        audio: { mode: "never" },
        price_per_sec: 0.08,
      },
      "runwayml/gen-4.5": {
        durations: [5, 10],
        start_image: "image",
        audio: { mode: "never" },
        price_per_sec: 0.25,
      },
      "kwaivgi/kling-v3-omni-video": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "start_image",
        last_image: "end_image",
        reference_images_param: "reference_images",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.3,
      },
      "kwaivgi/kling-v3-video": {
        durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        start_image: "start_image",
        last_image: "end_image",
        reference_images_param: "reference_images",
        audio: { mode: "optional", param: "generate_audio" },
        price_per_sec: 0.3,
      },
    } as Record<ReplicateModel, ReplicateMovieModelParams>,
  },
  google: {
    agentName: "movieGenAIAgent",
    defaultModel: "veo-2.0-generate-001",
    models: ["veo-2.0-generate-001", "veo-3.0-generate-001", "veo-3.1-generate-preview", "veo-3.1-lite-generate-preview"],
    keyName: "GEMINI_API_KEY",
    modelParams: {
      "veo-3.1-lite-generate-preview": {
        durations: [4, 6, 8],
        supportsDuration: true,
        supportsLastFrame: true,
        supportsReferenceImages: false,
        supportsPersonGeneration: false,
        audio: { mode: "always" },
      },
      "veo-3.1-generate-preview": {
        durations: [4, 6, 8],
        supportsDuration: true,
        supportsLastFrame: true,
        supportsReferenceImages: true,
        supportsPersonGeneration: false,
        audio: { mode: "always" },
      },
      "veo-3.0-generate-001": {
        durations: [8],
        supportsDuration: false, // Veo 3.0 always generates 8s
        supportsLastFrame: false,
        supportsReferenceImages: false,
        supportsPersonGeneration: false,
        audio: { mode: "always" },
      },
      "veo-2.0-generate-001": {
        durations: [5, 6, 8],
        supportsDuration: true,
        supportsLastFrame: false, // Vertex AI only
        supportsReferenceImages: false,
        supportsPersonGeneration: true,
        audio: { mode: "never" },
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
    } as Record<ReplicateModel, { identifier?: `${string}/${string}:${string}` | `${string}/${string}`; video?: string; audio: string; image?: string }>,
  },
};

// : Record<LLM, { agent: string; defaultModel: string; max_tokens: number }>
export const provider2LLMAgent = {
  openai: {
    agentName: "openAIAgent",
    defaultModel: "gpt-5",
    keyName: "OPENAI_API_KEY",
    baseURLKeyName: "OPENAI_BASE_URL",
    apiVersionKeyName: "OPENAI_API_VERSION",
    max_tokens: 8192,
    models: [
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
    defaultModel: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    models: ["claude-opus-4-1-20250805", "claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    keyName: "ANTHROPIC_API_KEY",
    apiKeyNameOverride: "ANTHROPIC_API_TOKEN",
    // GraphAI is currently using ANTHROPIC_API_KEY, but the official name is ANTHROPIC_API_TOKEN.
  },
  gemini: {
    agentName: "geminiAgent",
    defaultModel: "gemini-2.5-flash",
    max_tokens: 8192,
    models: ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
    keyName: "GEMINI_API_KEY",
  },
  groq: {
    agentName: "groqAgent",
    defaultModel: "llama-3.1-8b-instant",
    keyName: "GROQ_API_KEY",
    max_tokens: 4096,
    models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"],
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

export const getModelDuration = (provider: keyof typeof provider2MovieAgent, model: string, movieDuration?: number) => {
  const modelParams = provider2MovieAgent[provider]?.modelParams as Record<string, { durations?: number[] }>;
  const { durations } = modelParams[model];
  if (durations && movieDuration) {
    const largerDurations = durations.filter((d: number) => d >= movieDuration);
    return largerDurations.length > 0 ? largerDurations[0] : durations[durations.length - 1];
  }
  return durations?.[0];
};
