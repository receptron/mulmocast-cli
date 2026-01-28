import dotenv from "dotenv";
import { GraphAILogger, GraphAI } from "graphai";
import { textInputAgent } from "@graphai/input_agents";

import { consoleStreamDataAgentFilter } from "@graphai/stream_agent_filter/node";

import { openAIAgent } from "@graphai/openai_agent";
import { anthropicAgent } from "@graphai/anthropic_agent";
import { geminiAgent } from "@graphai/gemini_agent";
import { groqAgent } from "@graphai/groq_agent";

import * as agents from "@graphai/vanilla";

import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import { readTemplatePrompt, mkdir } from "../utils/file.js";
import { browserlessCacheGenerator } from "../utils/filters.js";
import { mulmoScriptSchema, ScriptingParams } from "../types/index.js";
import { browserlessAgent } from "@graphai/browserless_agent";
import validateSchemaAgent from "../agents/validate_schema_agent.js";
import { llmPair, settings2GraphAIConfig } from "../utils/utils.js";
import { interactiveClarificationPrompt, prefixPrompt } from "../utils/prompt.js";
// import { cliLoadingPlugin } from "../utils/plugins.js";

dotenv.config({ quiet: true });

const vanillaAgents = agents.default ?? agents;

const agentHeader = "\x1b[34m● \x1b[0m\x1b[1mAgent\x1b[0m:\x1b[0m";

const graphDataForScraping = {
  version: 0.5,
  nodes: {
    urls: {
      value: [],
    },
    fetchResults: {
      agent: "mapAgent",
      inputs: {
        rows: ":urls",
      },
      params: {
        compositeResult: true,
      },
      graph: {
        nodes: {
          fetcher: {
            agent: "browserlessAgent",
            inputs: {
              url: ":row",
              text_content: true,
            },
          },
          copyAgent: {
            agent: "copyAgent",
            inputs: {
              text: '{ url: "${:row}", text: "${:fetcher.text}" }',
            },
            params: {
              namedKey: "text",
            },
            isResult: true,
          },
        },
      },
    },
    sourceText: {
      agent: "arrayJoinAgent",
      inputs: {
        array: ":fetchResults.copyAgent",
      },
      params: {
        separator: ",",
      },
      isResult: true,
    },
  },
};

const graphData = {
  version: 0.5,
  loop: {
    while: ":continue",
  },
  nodes: {
    llmAgent: {
      update: ":llmAgent",
    },
    llmModel: {
      update: ":llmModel",
    },
    maxTokens: {
      update: ":maxTokens",
    },
    fileName: {
      update: ":fileName",
    },
    outdir: {
      update: ":outdir",
    },
    messages: {
      value: [],
      update: ":reply.chatAgent.messages",
    },
    userInput: {
      agent: "textInputAgent",
      params: {
        message: "You:",
        required: true,
      },
    },
    reply: {
      agent: "nestedAgent",
      inputs: {
        messages: ":messages",
        prompt: ":userInput.text",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      graph: {
        loop: {
          while: ":continue",
        },
        nodes: {
          counter: {
            value: 0,
            update: ":counter.add(1)",
          },
          chatAgent: {
            agent: ":llmAgent",
            inputs: {
              messages: ":messages",
              prompt: ":prompt",
              params: {
                model: ":llmModel",
                stream: true,
                dataStream: true,
                max_tokens: ":maxTokens",
              },
            },
            isResult: true,
          },
          validateSchemaAgent: {
            if: ":chatAgent.text.codeBlock()",
            defaultValue: false,
            agent: "validateSchemaAgent",
            inputs: {
              text: ":chatAgent.text.codeBlock()",
              schema: mulmoScriptSchema,
            },
          },
          continue: {
            agent: ({ codeBlock, isValid, counter }: { codeBlock: string | undefined; isValid: boolean; counter: number }) => {
              if (counter >= 3) {
                GraphAILogger.info("\n" + agentHeader + " \x1b[31mFailed to generate a valid script. Please try again.\n");
                return false;
              }
              const result = !!codeBlock && !isValid;
              if (result) {
                GraphAILogger.info("\n" + agentHeader + " Generated script was broken. Retry generate a script.");
              }
              return result;
            },
            inputs: {
              counter: ":counter",
              codeBlock: ":chatAgent.text.codeBlock()",
              isValid: ":validateSchemaAgent.isValid",
            },
          },
        },
      },
    },
    json: {
      agent: "copyAgent",
      inputs: {
        json: ":reply.chatAgent.text.codeBlock().jsonParse()",
        text: ":reply.chatAgent.text.codeBlock()",
      },
    },
    writeJSON: {
      if: ":json.json",
      agent: "fileWriteAgent",
      inputs: {
        file: "${:outdir}/${:fileName}-${@now}.json",
        text: ":json.text",
      },
    },
    writeLog: {
      agent: "consoleAgent",
      inputs: {
        text: "\n\x1b[32m🎉 Script file generated successfully! Type /bye to exit.\x1b[0m\nwriting: ${:writeJSON.path}",
        waiting: ":writeJSON",
      },
    },
    shouldResponse: {
      agent: "compareAgent",
      inputs: {
        array: [[":json.json", "==", undefined], "&&", [":userInput.text", "!=", "/bye"]],
      },
    },
    checkInput: {
      agent: "compareAgent",
      inputs: { array: [":userInput.text", "!=", "/bye"] },
    },
    continue: {
      value: true,
      update: ":checkInput.result",
    },
  },
};

const scrapeWebContent = async (urls: string[], cacheDirPath: string) => {
  mkdir(cacheDirPath);
  GraphAILogger.info(`${agentHeader} Scraping ${urls.length} URLs...\n`);

  const browserlessCache = browserlessCacheGenerator(cacheDirPath);
  const agentFilters = [
    {
      name: "browserlessCache",
      agent: browserlessCache,
      nodeIds: ["fetcher"],
    },
  ];

  const graph = new GraphAI(graphDataForScraping, { ...vanillaAgents, openAIAgent, textInputAgent, fileWriteAgent, browserlessAgent }, { agentFilters });
  graph.injectValue("urls", urls);

  const result = (await graph.run()) as { sourceText: { text: string } };
  if (!result?.sourceText?.text) {
    return "";
  }
  return `\n\n${prefixPrompt}\n${result?.sourceText.text}`;
};

export const createMulmoScriptInteractively = async ({ outDirPath, cacheDirPath, filename, templateName, urls, llm, llm_model }: ScriptingParams) => {
  mkdir(outDirPath);
  // if urls is not empty, scrape web content and reference it in the prompt
  const webContentPrompt = urls.length > 0 ? await scrapeWebContent(urls, cacheDirPath) : "";

  const { agent, model, max_tokens } = llmPair(llm, llm_model);
  GraphAILogger.log({ agent, model, max_tokens });

  const agentFilters = [
    {
      name: "consoleStreamDataAgentFilter",
      agent: consoleStreamDataAgentFilter,
      nodeIds: ["chatAgent"],
    },
  ];

  const config = settings2GraphAIConfig(undefined, process.env);
  const graph = new GraphAI(
    graphData,
    { ...vanillaAgents, anthropicAgent, geminiAgent, groqAgent, openAIAgent, textInputAgent, fileWriteAgent, validateSchemaAgent },
    { agentFilters, config },
  );

  const prompt = readTemplatePrompt(templateName);
  graph.injectValue("messages", [
    {
      role: "system",
      content: `${prompt}\n\n${interactiveClarificationPrompt}${webContentPrompt}`,
    },
  ]);
  graph.injectValue("outdir", outDirPath);
  graph.injectValue("fileName", filename);
  graph.injectValue("llmAgent", agent);
  graph.injectValue("llmModel", model);
  graph.injectValue("maxTokens", max_tokens);
  graph.registerCallback(({ nodeId, state }) => {
    if (nodeId === "chatAgent") {
      if (state === "executing") {
        process.stdout.write(String("\n" + agentHeader + " "));
      }
      if (state === "completed") {
        process.stdout.write("\n\n");
      }
    }
  });
  // graph.registerCallback(cliLoadingPlugin({ nodeId: "reply", message: "Loading..." }));

  GraphAILogger.info(`${agentHeader} Hi! What topic would you like me to generate about?\n`);
  await graph.run();
};
