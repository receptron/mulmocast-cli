// node & browser

export const provider2TTSAgent = {
  nijivoice: {
    agentName: "ttsNijivoiceAgent",
    hasLimitedConcurrency: true,
  },
  openai: {
    agentName: "ttsOpenaiAgent",
    hasLimitedConcurrency: false,
    defaultModel: "gpt-4o-mini-tts",
    defaultVoice: "shimmer",
  },
  google: {
    agentName: "ttsGoogleAgent",
    hasLimitedConcurrency: false,
  },
  elevenlabs: {
    agentName: "ttsElevenlabsAgent",
    hasLimitedConcurrency: true,
    defaultModel: "eleven_multilingual_v2",
    // Models | ElevenLabs Documentation
    // https://elevenlabs.io/docs/models
    models: ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_flash_v2_5", "eleven_flash_v2"],
  },
  mock: {
    agentName: "mediaMockAgent",
    hasLimitedConcurrency: true,
    defaultModel: "mock-model",
    models: ["mock-model"],
  },
};

export const provider2ImageAgent = {
  openai: {
    agentName: "imageOpenaiAgent",
    defaultModel: "gpt-image-1",
    models: ["dall-e-3", "gpt-image-1"],
  },
  google: {
    agentName: "imageGenAIAgent",
    defaultModel: "gemini-2.5-flash-image-preview",
    models: ["imagen-3.0-generate-002", "imagen-4.0-generate-preview-06-06", "imagen-4.0-ultra-generate-preview-06-06", "gemini-2.5-flash-image-preview"],
  },
  mock: {
    agentName: "mediaMockAgent",
    defaultModel: "mock-model",
    models: ["mock-model"],
  },
};

export type ReplicateModel = `${string}/${string}`;

export const provider2MovieAgent = {
  replicate: {
    agentName: "movieReplicateAgent",
    defaultModel: "bytedance/seedance-1-lite" as ReplicateModel,
    models: [
      "bytedance/seedance-1-lite",
      "bytedance/seedance-1-pro",
      "kwaivgi/kling-v1.6-pro",
      "kwaivgi/kling-v2.1",
      "kwaivgi/kling-v2.1-master",
      "google/veo-2",
      "google/veo-3",
      "google/veo-3-fast",
      "minimax/video-01",
      "minimax/hailuo-02",
      "minimax/hailuo-02-fast",
      "pixverse/pixverse-v4.5",
      "wan-video/wan-2.2-i2v-480p-fast",
      "wan-video/wan-2.2-t2v-480p-fast",
    ],
    modelParams: {
      "bytedance/seedance-1-lite": {
        durations: [5, 10],
        start_image: "image",
        last_image: "last_frame_image",
        price_per_sec: 0.036, // in USD
      },
      "bytedance/seedance-1-pro": {
        durations: [5, 10],
        start_image: "image",
        last_image: "last_frame_image",
        price_per_sec: 0.15,
      },
      "kwaivgi/kling-v1.6-pro": {
        durations: [5, 10],
        start_image: "start_image",
        price_per_sec: 0.095,
      },
      "kwaivgi/kling-v2.1": {
        durations: [5, 10],
        start_image: "start_image",
        price_per_sec: 0.05,
      },
      "kwaivgi/kling-v2.1-master": {
        durations: [5, 10],
        start_image: "start_image",
        price_per_sec: 0.28,
      },
      "google/veo-2": {
        durations: [5, 6, 7, 8],
        start_image: "image",
        price_per_sec: 0.5,
      },
      "google/veo-3": {
        durations: [8],
        start_image: "image",
        price_per_sec: 0.75,
      },
      "google/veo-3-fast": {
        durations: [8],
        start_image: "image",
        price_per_sec: 0.4,
      },
      "minimax/video-01": {
        durations: [6],
        start_image: "first_frame_image",
        price_per_sec: 0.5,
      },
      "minimax/hailuo-02": {
        durations: [6], // NOTE: 10 for only 720p
        start_image: "first_frame_image",
        price_per_sec: 0.08,
      },
      "minimax/hailuo-02-fast": {
        durations: [6, 10], // NOTE: 512P
        start_image: "first_frame_image",
        price_per_sec: 0.0166,
      },
      "pixverse/pixverse-v4.5": {
        durations: [5, 8],
        start_image: "image",
        last_image: "last_frame_image",
        price_per_sec: 0.12,
      },
      "wan-video/wan-2.2-i2v-480p-fast": {
        durations: [5],
        start_image: "image",
        price_per_sec: 0.012,
      },
      "wan-video/wan-2.2-t2v-480p-fast": {
        durations: [5],
        start_image: undefined,
        price_per_sec: 0.012,
      },
    } as Record<ReplicateModel, { durations: number[]; start_image: string | undefined; last_image?: string; price_per_sec: number }>,
  },
  google: {
    agentName: "movieGenAIAgent",
    defaultModel: "veo-2.0-generate-001",
    models: ["veo-2.0-generate-001", "veo-3.0-generate-preview"],
  },
  mock: {
    agentName: "mediaMockAgent",
    defaultModel: "mock-model",
    models: ["mock-model"],
  },
};

export const provider2SoundEffectAgent = {
  replicate: {
    agentName: "soundEffectReplicateAgent",
    defaultModel: "zsxkib/mmaudio" as ReplicateModel,
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
    models: ["bytedance/latentsync", "tmappdev/lipsync", "bytedance/omni-human"] as ReplicateModel[],
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
      /* NOTE: This model does not work with large base64 urls.
      "sync/lipsync-2": {
        video: "video",
        audio: "audio",
      },
      */
      /* NOTE: This model does not work well for some unknown reason.
      "kwaivgi/kling-lip-sync": {
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
    defaultModel: "claude-3-7-sonnet-20250219",
    max_tokens: 8192,
    models: ["claude-opus-4-1-20250805", "claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-haiku-20240307"],
  },
  gemini: {
    agentName: "geminiAgent",
    defaultModel: "gemini-2.5-flash",
    max_tokens: 8192,
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  },
  groq: {
    agentName: "groqAgent",
    defaultModel: "llama-3.1-8b-instant",
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
