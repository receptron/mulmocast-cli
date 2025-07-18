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
    defaultModel: "bytedance/seedance-1-lite" as `${string}/${string}`,
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
      "pixverse/pixverse-v4.5",
    ],
  },
  google: {
    agentName: "movieGoogleAgent",
    defaultModel: "veo-2.0-generate-001",
    models: ["veo-2.0-generate-001"],
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

export const defaultProviders: {
  tts: keyof typeof provider2TTSAgent;
  text2image: keyof typeof provider2ImageAgent;
  text2movie: keyof typeof provider2MovieAgent;
  text2Html: keyof typeof provider2LLMAgent;
  llm: keyof typeof provider2LLMAgent;
} = {
  tts: "openai",
  text2image: "openai",
  text2movie: "replicate",
  text2Html: "openai",
  llm: "openai",
};

export const llm = Object.keys(provider2LLMAgent) as (keyof typeof provider2LLMAgent)[];
export type LLM = keyof typeof provider2LLMAgent;

export const htmlLLMProvider = ["openai", "anthropic"];
