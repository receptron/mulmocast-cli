import OpenAI, { AzureOpenAI } from "openai";

export interface OpenAIClientOptions {
  apiKey?: string;
  baseURL?: string;
  apiVersion?: string; // Azure only
}

/**
 * Detects if the given URL is an Azure OpenAI endpoint
 */
export const isAzureEndpoint = (baseURL: string | undefined): boolean => {
  return baseURL?.includes(".openai.azure.com") ?? false;
};

/**
 * Creates an OpenAI or AzureOpenAI client based on the baseURL
 * - If baseURL contains ".openai.azure.com", returns AzureOpenAI client
 * - Otherwise, returns standard OpenAI client
 */
export const createOpenAIClient = (options: OpenAIClientOptions): OpenAI => {
  const { apiKey, baseURL, apiVersion } = options;

  console.log(baseURL, options);
  if (isAzureEndpoint(baseURL)) {
    console.log("AZURE");
    return new AzureOpenAI({
      apiKey,
      endpoint: baseURL,
      apiVersion: apiVersion ?? "2025-04-01-preview",
    });
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
};
