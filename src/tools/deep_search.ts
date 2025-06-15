import "dotenv/config";
import { GraphAILogger, GraphAI } from "graphai";
import { textInputAgent } from "@graphai/input_agents";

import { consoleStreamDataAgentFilter } from "@graphai/stream_agent_filter/node";

import { openAIAgent } from "@graphai/openai_agent";

import * as agents from "@graphai/vanilla";

import tavilySearchAgent from "../agents/tavily_agent.js";
import { cliLoadingPlugin } from "../utils/plugins.js";
import { searchQueryPrompt, reflectionPrompt, finalAnswerPrompt } from "../utils/prompt.js";

const vanillaAgents = agents.default ?? agents;

const agentHeader = "\x1b[34m● \x1b[0m\x1b[1mAgent\x1b[0m:\x1b[0m";

const graphData = {
  version: 0.5,
  nodes: {
    maxRetries: {
      value: 0,
    },
    userInput: {
      agent: "textInputAgent",
      params: {
        message: "You:",
        required: true,
      },
    },
    startMessage: {
      agent: "consoleAgent",
      inputs: {
        text: `\n${agentHeader} It takes a few minutes to gather resources, analyze data, and create a report.`,
        userInput: ":userInput.text",
      },
    },
    deepSearch: {
      agent: "nestedAgent",
      inputs: {
        userInput: ":userInput.text",
        maxRetries: ":maxRetries",
        startMessage: ":startMessage",
      },
      graph: {
        loop: {
          while: ":continue",
        },
        nodes: {
          searchResults: {
            value: [],
            update: ":reducer.array",
          },
          followUpQueries: {
            value: [],
            update: ":reflectionAgent.follow_up_queries",
          },
          counter: {
            value: 0,
            update: ":counter.add(1)",
          },
          searchQueryAgent: {
            agent: "openAIAgent",
            inputs: {
              model: "gpt-4o-mini",
              system: "You are a professional research assistant. Based on the user's inquiry, return the search query to be used for the search engine.",
              prompt: searchQueryPrompt("${:userInput}", "${:followUpQueries.join(,)}"),
            },
            params: {
              tool_choice: "auto",
              tools: [
                {
                  type: "function",
                  function: {
                    name: "search_query",
                    description: "Return the search queries to be used for the search engine.",
                    parameters: {
                      type: "object",
                      properties: {
                        queries: {
                          type: "array",
                          items: {
                            type: "string",
                            description: "A search query to be used for the search engine.",
                          },
                          description: "An array of search queries to be used for the search engine.",
                        },
                        research_topic: {
                          type: "string",
                          description: "The topic of the research. This is used to filter the search results.",
                        },
                        analysis_plan: {
                          type: "string",
                          description:
                            "A detailed plan for analyzing the research topic, including main areas to investigate, key factors, and specific aspects that need deeper investigation",
                        },
                      },
                      required: ["queries", "research_topic", "analysis_plan"],
                    },
                  },
                },
              ],
            },
            output: {
              queries: ".tool.arguments.queries",
              research_topic: ".tool.arguments.research_topic",
              analysis_plan: ".tool.arguments.analysis_plan",
            },
          },
          logSearchQuery: {
            agent: "consoleAgent",
            inputs: {
              text: "\n" + agentHeader + " ${:searchQueryAgent.analysis_plan}",
            },
          },
          mapSearchAgent: {
            agent: "mapAgent",
            inputs: {
              rows: ":searchQueryAgent.queries",
            },
            params: {
              compositeResult: true,
            },
            graph: {
              nodes: {
                tavilySearchAgent: {
                  agent: "tavilySearchAgent",
                  inputs: {
                    query: ":row",
                  },
                  params: {
                    max_results: 3,
                  },
                },
                result: {
                  agent: "copyAgent",
                  inputs: {
                    results: ":tavilySearchAgent.results",
                  },
                  params: {
                    namedKey: "results",
                  },
                  isResult: true,
                },
                logSearchStatus: {
                  agent: ({ result }: { result: { title: string; url: string }[] }) => {
                    GraphAILogger.info(result.map((r) => `- [${r.title}](${r.url})`).join("\n"));
                  },
                  inputs: {
                    result: ":result",
                  },
                },
              },
            },
          },
          extractResults: {
            agent: "copyAgent",
            inputs: {
              results: ":mapSearchAgent.result.flat()",
            },
            params: {
              namedKey: "results",
            },
          },
          reflectionAgent: {
            agent: "openAIAgent",
            inputs: {
              model: "gpt-4o-mini",
              system:
                "You are a professional research assistant. Based on the user's inquiry and the search results, return the sufficiency of information, knowledge gaps, and follow-up queries as a function call.",
              prompt: reflectionPrompt("${:searchQueryAgent.research_topic}", "${:reducer.array.toJSON()}"),
            },
            params: {
              tool_choice: "auto",
              tools: [
                {
                  type: "function",
                  function: {
                    name: "research_sufficiency",
                    description: "Return whether the information is sufficient, any knowledge gaps, and follow-up queries for the user's inquiry.",
                    parameters: {
                      type: "object",
                      properties: {
                        is_sufficient: {
                          type: "boolean",
                          description: "Whether the information is sufficient",
                        },
                        knowledge_gap: {
                          type: "string",
                          description: "Summary of missing knowledge or information",
                        },
                        follow_up_queries: {
                          type: "array",
                          items: {
                            type: "string",
                            description: "Additional questions to investigate (up to 3 maximum)",
                          },
                        },
                      },
                      required: ["is_sufficient", "knowledge_gap", "follow_up_queries"],
                    },
                  },
                },
              ],
            },
            output: {
              is_sufficient: ".tool.arguments.is_sufficient",
              knowledge_gap: ".tool.arguments.knowledge_gap",
              follow_up_queries: ".tool.arguments.follow_up_queries",
            },
          },
          reducer: {
            agent: "pushAgent",
            inputs: {
              array: ":searchResults",
              items: ":extractResults",
            },
          },
          continue: {
            agent: ({
              is_sufficient,
              knowledge_gap,
              counter,
              maxRetries,
            }: {
              is_sufficient: boolean;
              knowledge_gap: string;
              counter: number;
              maxRetries: number;
            }) => {
              if (is_sufficient || counter >= maxRetries - 1) {
                GraphAILogger.info(`\n${agentHeader} All necessary information has been gathered. Preparing comprehensive report.`);
                return false;
              }
              GraphAILogger.info(`\n${agentHeader} ${knowledge_gap}`);
              return true;
            },
            inputs: {
              is_sufficient: ":reflectionAgent.is_sufficient",
              knowledge_gap: ":reflectionAgent.knowledge_gap",
              counter: ":counter",
              maxRetries: ":maxRetries",
            },
          },
          finalAnswer: {
            agent: "openAIAgent",
            unless: ":continue",
            inputs: {
              model: "gpt-4o-mini",
              system: "You are a professional research assistant. Based on the user's inquiry and the search results, return the final answer.",
              prompt: finalAnswerPrompt("${:userInput}", "${:searchResults.toJSON()}", "${:searchQueryAgent.research_topic}"),
            },
            isResult: true,
          },
        },
      },
    },
    writeResult: {
      agent: "consoleAgent",
      inputs: {
        text: "\n------Answer------\n\n${:deepSearch.finalAnswer.text}\n",
      },
    },
  },
};

export const deepSearch = async () => {
  const agentFilters = [
    {
      name: "consoleStreamDataAgentFilter",
      agent: consoleStreamDataAgentFilter,
      nodeIds: ["chatAgent"],
    },
  ];

  const graph = new GraphAI(graphData, { ...vanillaAgents, openAIAgent, textInputAgent, tavilySearchAgent }, { agentFilters });

  graph.injectValue("maxRetries", 3);
  graph.registerCallback(cliLoadingPlugin({ nodeId: "searchQueryAgent", message: "Generating search queries..." }));
  graph.registerCallback(cliLoadingPlugin({ nodeId: "reflectionAgent", message: "Analyzing search results..." }));
  graph.registerCallback(cliLoadingPlugin({ nodeId: "tavilySearchAgent", message: "Searching..." }));
  graph.registerCallback(cliLoadingPlugin({ nodeId: "finalAnswer", message: "Generating final answer..." }));

  GraphAILogger.info(`${agentHeader} What would you like to know?\n`);
  await graph.run();
};

deepSearch();
