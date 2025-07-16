export const defaultProviders = {
  tts: "openai",
  text2image: "openai",
  text2movie: "google",
  text2Html: "openai",
  llm: "openai",
  soundEffect: "replicate",
};

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
};

export const provider2ImageAgent = {
  openai: {
    agentName: "imageOpenaiAgent",
    defaultModel: "gpt-image-1",
    models: ["dall-e-3", "gpt-image-1"],
  },
  google: {
    agentName: "imageGoogleAgent",
    defaultModel: "imagen-3.0-fast-generate-001",
    models: ["imagen-3.0-fast-generate-001", "imagen-3.0-generate-002", "imagen-3.0-capability-001"],
  },
};

export const provider2MovieAgent = {
  replicate: {
    agentName: "movieReplicateAgent",
    models: [
      "bytedance/seedance-1-lite",
      "bytedance/seedance-1-pro",
      "kwaivgi/kling-v1.6-pro",
      "kwaivgi/kling-v2.1",
      "google/veo-2",
      "google/veo-3",
      "google/veo-3-fast",
      "minimax/video-01",
    ],
  },
  google: {
    agentName: "movieGoogleAgent",
    models: ["veo-2.0-generate-001"],
  },
};

export const provider2SoundEffectAgent = {
  replicate: {
    agentName: "soundEffectReplicateAgent",
    defaultModel: "zsxkib/mmaudio",
    models: ["zsxkib/mmaudio"],
  },
};

// : Record<LLM, { agent: string; defaultModel: string; max_tokens: number }>
export const provider2LLMAgent = {
  openai: {
    agentName: "openAIAgent",
    defaultModel: "gpt-4o",
    max_tokens: 8192,
  },
  anthropic: {
    agentName: "anthropicAgent",
    defaultModel: "claude-3-7-sonnet-20250219",
    max_tokens: 8192,
  },
  gemini: {
    agentName: "geminiAgent",
    defaultModel: "gemini-1.5-flash",
    max_tokens: 8192,
  },
  groq: {
    agentName: "groqAgent",
    defaultModel: "llama3-8b-8192",
    max_tokens: 4096,
  },
} as const;

export const llm = Object.keys(provider2LLMAgent) as (keyof typeof provider2LLMAgent)[];
export type LLM = keyof typeof provider2LLMAgent;

export const htmlLLMProvider = ["openai", "anthropic"];
