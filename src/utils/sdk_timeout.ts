// Timeout budgets for provider SDK calls (OpenAI has its own in openai_client.ts).
// Generous safety nets against a stalled connection or a never-completing
// operation — NOT tight deadlines. A stall becomes a rejection so the caller's
// GraphAI `retry` can recover instead of hanging forever.
export const GENAI_REQUEST_TIMEOUT_MS = 120_000; // per @google/genai API call (kick-off / each poll)
export const REPLICATE_RUN_TIMEOUT_MS = 600_000; // whole replicate.run() job (video models run minutes)
export const VIDEO_POLL_TIMEOUT_MS = 1_200_000; // wall-clock cap for a long-running Veo video operation
