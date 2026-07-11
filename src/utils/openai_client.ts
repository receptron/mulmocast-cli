import OpenAI, { AzureOpenAI } from "openai";

// Explicit per-request timeout so a stalled connection rejects (and the SDK's
// default maxRetries=2 re-issues it) instead of hanging on the SDK's 10-minute
// default. gpt-image-1 generation is typically well under this.
const OPENAI_REQUEST_TIMEOUT_MS = 120_000;

export interface OpenAIClientOptions {
  apiKey?: string;
  baseURL?: string;
  apiVersion?: string; // Azure only
}

/**
 * Detects if the given URL is an Azure OpenAI endpoint
 * Safely parses the URL and checks if the hostname ends with ".openai.azure.com"
 */
export const isAzureEndpoint = (baseURL: string | undefined): boolean => {
  if (!baseURL) return false;
  try {
    const url = new URL(baseURL);
    return url.hostname.endsWith(".openai.azure.com");
  } catch {
    return false;
  }
};

/**
 * Creates an OpenAI or AzureOpenAI client based on the baseURL
 * - If baseURL contains ".openai.azure.com", returns AzureOpenAI client
 * - Otherwise, returns standard OpenAI client
 */
export const createOpenAIClient = (options: OpenAIClientOptions): OpenAI => {
  const { apiKey, baseURL, apiVersion } = options;

  if (isAzureEndpoint(baseURL)) {
    return new AzureOpenAI({
      apiKey,
      endpoint: baseURL,
      apiVersion: apiVersion ?? "2025-04-01-preview",
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });
  }

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: OPENAI_REQUEST_TIMEOUT_MS,
  });
};
