import { AgentFunction, AgentFunctionInfo, assert, DefaultConfigData } from "graphai";
import { tavily, type TavilySearchResponse } from "@tavily/core";

type TavilySearchInputs = {
  query: string;
};

type TavilySearchParams = {
  apiKey?: string;
  max_results?: number;
  search_depth?: "basic" | "advanced";
  include_answer?: boolean;
  include_raw_content?: boolean | "markdown" | "text";
};

const getTavilyApiKey = (params: TavilySearchParams, config?: DefaultConfigData) => {
  if (params?.apiKey) {
    return params.apiKey;
  }
  if (config?.apiKey) {
    return config.apiKey;
  }
  return typeof process !== "undefined" ? process?.env?.TAVILY_API_KEY : null;
};

export const tavilySearchAgent: AgentFunction<TavilySearchParams, TavilySearchResponse, TavilySearchInputs, DefaultConfigData> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { query } = namedInputs;

  assert(!!query, "tavilySearchAgent: query is required! set inputs: { query: 'search terms' }");

  try {
    const apiKey = getTavilyApiKey(params, config);
    assert(apiKey, "Tavily API key is required. Please set the TAVILY_API_KEY environment variable or provide it in params/config.");

    const tvly = tavily({ apiKey });

    // Convert params to SDK options format
    const sdkOptions: Record<string, unknown> = {};
    if (params?.max_results !== undefined) sdkOptions.maxResults = params.max_results;
    if (params?.search_depth !== undefined) sdkOptions.searchDepth = params.search_depth;
    if (params?.include_answer !== undefined) sdkOptions.includeAnswer = params.include_answer;
    if (params?.include_raw_content !== undefined) sdkOptions.includeRawContent = params.include_raw_content;

    const response = await tvly.search(query, sdkOptions);

    return response;
  } catch (error) {
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const tavilySearchAgentInfo: AgentFunctionInfo = {
  name: "tavilySearchAgent",
  agent: tavilySearchAgent,
  mock: tavilySearchAgent,
  params: {
    type: "object",
    properties: {
      apiKey: {
        type: "string",
        description: "Tavily API key",
      },
      max_results: {
        type: "number",
        description: "Maximum number of search results to return (default: 5)",
      },
      search_depth: {
        type: "string",
        enum: ["basic", "advanced"],
        description: "Search depth - basic for faster results, advanced for more comprehensive results",
      },
      include_answer: {
        type: "boolean",
        description: "Include a direct answer to the query when available",
      },
      include_raw_content: {
        type: "string",
        enum: ["boolean", "markdown", "text"],
        description: "Include raw content from search results (boolean, markdown, text)",
      },
    },
  },
  inputs: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query string",
      },
    },
    required: ["query"],
  },
  output: {
    type: "object",
    properties: {
      query: { type: "string" },
      answer: { type: ["string", "null"] },
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            content: { type: "string" },
            rawContent: { type: ["string", "null"] },
            score: { type: "number" },
          },
        },
      },
    },
  },
  samples: [
    {
      inputs: {
        query: "latest AI developments 2024",
      },
      params: {
        max_results: 3,
        include_answer: true,
      },
      result: {
        query: "latest AI developments 2024",
        answer: "Recent AI developments in 2024 include...",
        results: [
          {
            title: "Major AI Breakthroughs in 2024",
            url: "https://example.com/ai-2024",
            content: "The year 2024 has seen significant advances in artificial intelligence...",
            rawContent: null,
            score: 0.95,
          },
        ],
      },
    },
  ],
  description: "Performs web search using Tavily API and returns relevant search results with optional AI-generated answers",
  category: ["search", "web"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/tree/main/src/agents/tavily_agent.ts",
  source: "https://github.com/receptron/mulmocast-cli/tree/main/src/agents/tavily_agent.ts",
  package: "@receptron/mulmocast-cli",
  license: "MIT",
  environmentVariables: ["TAVILY_API_KEY"],
};

export default tavilySearchAgentInfo;
