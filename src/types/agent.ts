// for image agent

// NOTE: gpt-image-1 supports only '1024x1024', '1024x1536', '1536x1024'
export type OpenAIImageSize = "1792x1024" | "1024x1792" | "1024x1024" | "1536x1024" | "1024x1536";
export type OpenAIImageModeration = "low" | "auto";
export type OpenAIImageOptions = {
  model: string;
  prompt: string;
  n: number;
  size: OpenAIImageSize;
  moderation?: OpenAIImageModeration;
};

export type AgentBufferResult = { buffer: Buffer };
export type AgentPromptInputs = { prompt: string };
export type AgentTextInputs = { text: string };
export type AgentErrorResult = { error: unknown };
export type AgentConfig = { apiKey?: string };

// image
//   inputs
export type ImageAgentInputs = AgentPromptInputs;
export type OpenAIImageAgentInputs = AgentPromptInputs & { referenceImages: string[] | null | undefined };
//   params
export type ImageAgentParams = { model: string; canvasSize: { width: number; height: number } };
export type OpenAIImageAgentParams = ImageAgentParams & { moderation: OpenAIImageModeration | null | undefined };
//   config
export type OpenAIImageAgentConfig = { baseURL?: string; apiKey?: string };
export type GoogleImageAgentConfig = {
  projectId?: string;
  token?: string;
};

// movie
//   inputs
export type MovieAgentInputs = AgentPromptInputs & { imagePath?: string };
//   params
export type GoogleMovieAgentParams = ImageAgentParams & { duration?: number };
export type ReplicateMovieAgentParams = { model: `${string}/${string}` | undefined; canvasSize: { width: number; height: number }; duration?: number };

// sound effect
export type ReplicateSoundEffectAgentParams = { model: `${string}/${string}` | undefined };
export type SoundEffectAgentInputs = AgentPromptInputs & { soundEffectFile?: string; movieFile?: string };

//   config
export type GoogleMovieAgentConfig = GoogleImageAgentConfig;
export type ReplicateMovieAgentConfig = AgentConfig;
export type ReplicateSoundEffectAgentConfig = AgentConfig;

// end of image agent

export type TTSAgentParams = {
  suppressError: boolean;
  voice: string;
};
export type OpenAITTSAgentParams = TTSAgentParams & {
  instructions: string;
  model: string;
};

export type NijivoiceTTSAgentParams = TTSAgentParams & {
  speed: number;
  speed_global: number;
};

export type GoogleTTSAgentParams = TTSAgentParams & {
  speed: number;
};

export type ElevenlabsTTSAgentParams = TTSAgentParams & {
  model: string;
  stability: number;
  similarityBoost: number;
};
