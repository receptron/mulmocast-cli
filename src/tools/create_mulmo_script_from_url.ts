import dotenv from "dotenv";
import path from "path";
import { GraphAI, GraphAILogger, GraphData } from "graphai";
import { openAIAgent } from "@graphai/openai_agent";
import { anthropicAgent } from "@graphai/anthropic_agent";
import { geminiAgent } from "@graphai/gemini_agent";
import { groqAgent } from "@graphai/groq_agent";
import * as agents from "@graphai/vanilla";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import { browserlessAgent } from "@graphai/browserless_agent";
import validateSchemaAgent from "../agents/validate_schema_agent.js";
import { readTemplatePrompt, mkdir, writingMessage } from "../utils/file.js";
import { browserlessCacheGenerator } from "../utils/filters.js";
import { mulmoScriptSchema, urlsSchema } from "../types/schema.js";
import { ScriptingParams } from "../types/index.js";
import { cliLoadingPlugin } from "../utils/plugins.js";
import { graphDataScriptFromUrlPrompt } from "../utils/prompt.js";
import { llmPair } from "../utils/utils.js";
import { readFileSync } from "fs";

dotenv.config({ quiet: true });

const vanillaAgents = agents.default ?? agents;

const showErrorMessage = (text: string) => {
  GraphAILogger.info("\x1b[31m" + text + "\x1b[0m");
};

const graphMulmoScript: GraphData = {
  version: 0.5,
  loop: {
    // If the script is not valid and the counter is less than 3, continue the loop
    while: ":continue",
  },
  nodes: {
    sourceText: {},
    systemPrompt: {},
    llmAgent: {},
    llmModel: {},
    maxTokens: {},
    counter: {
      value: 0,
      update: ":counter.add(1)",
    },
    llm: {
      agent: ":llmAgent",
      // console: { before: true },
      inputs: {
        system: ":systemPrompt",
        prompt: graphDataScriptFromUrlPrompt("${:sourceText.text}"),
        params: {
          model: ":llmModel",
          system: ":systemPrompt",
          max_tokens: ":maxTokens",
        },
      },
    },
    validateSchemaAgent: {
      agent: "validateSchemaAgent",
      inputs: {
        text: ":llm.text.codeBlock()",
        schema: mulmoScriptSchema,
      },
      isResult: true,
    },
    continue: {
      agent: ({ isValid, counter }) => {
        return !isValid && counter < 3;
      },
      inputs: {
        isValid: ":validateSchemaAgent.isValid",
        counter: ":counter",
      },
    },
  },
};

const graphData: GraphData = {
  version: 0.5,
  // Execute sequentially because the free version of browserless API doesn't support concurrent execution.
  concurrency: 1,
  nodes: {
    urls: {
      value: [],
    },
    systemPrompt: {
      value: "",
    },
    outdir: {
      value: "",
    },
    fileName: {
      value: "",
    },
    llmAgent: {
      value: "",
    },
    llmModel: {
      value: "",
    },
    maxTokens: {
      value: 0,
    },
    // get the text content of the urls
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
    // join the text content
    sourceText: {
      agent: "arrayJoinAgent",
      inputs: {
        array: ":fetchResults.copyAgent",
      },
      params: {
        separator: ",",
      },
    },
    // generate the mulmo script
    mulmoScript: {
      agent: "nestedAgent",
      inputs: {
        sourceText: ":sourceText",
        systemPrompt: ":systemPrompt",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      graph: graphMulmoScript,
    },
    writeJSON: {
      if: ":mulmoScript.validateSchemaAgent.isValid",
      agent: "fileWriteAgent",
      inputs: {
        file: "${:outdir}/${:fileName}-${@now}.json",
        text: ":mulmoScript.validateSchemaAgent.data.toJSON()",
      },
      isResult: true,
    },
  },
};

const graphDataText: GraphData = {
  version: 0.5,
  // Execute sequentially because the free version of browserless API doesn't support concurrent execution.
  concurrency: 1,
  nodes: {
    systemPrompt: {
      value: "",
    },
    outdir: {
      value: "",
    },
    fileName: {
      value: "",
    },
    llmAgent: {
      value: "",
    },
    llmModel: {
      value: "",
    },
    maxTokens: {
      value: 0,
    },
    sourceText: {},
    // generate the mulmo script
    mulmoScript: {
      agent: "nestedAgent",
      // console: { before: true },
      inputs: {
        sourceText: ":sourceText",
        systemPrompt: ":systemPrompt",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      graph: graphMulmoScript,
    },
    writeJSON: {
      if: ":mulmoScript.validateSchemaAgent.isValid",
      agent: "fileWriteAgent",
      inputs: {
        file: "${:outdir}/${:fileName}-${@now}.json",
        text: ":mulmoScript.validateSchemaAgent.data.toJSON()",
      },
      isResult: true,
    },
  },
};

export const createMulmoScriptFromUrl = async ({ urls, templateName, outDirPath, filename, cacheDirPath, llm, llm_model }: ScriptingParams) => {
  mkdir(outDirPath);
  mkdir(cacheDirPath);
  const parsedUrls = urlsSchema.parse(urls);

  const browserlessCache = browserlessCacheGenerator(cacheDirPath);
  const agentFilters = [
    {
      name: "browserlessCache",
      agent: browserlessCache,
      nodeIds: ["fetcher"],
    },
  ];
  const { agent, model, max_tokens } = llmPair(llm, llm_model);

  const graph = new GraphAI(
    graphData,
    {
      ...vanillaAgents,
      openAIAgent,
      anthropicAgent,
      geminiAgent,
      groqAgent,
      browserlessAgent,
      validateSchemaAgent,
      fileWriteAgent,
    },
    { agentFilters },
  );

  graph.injectValue("urls", parsedUrls);
  graph.injectValue("systemPrompt", readTemplatePrompt(templateName));
  graph.injectValue("outdir", outDirPath);
  graph.injectValue("fileName", filename);
  graph.injectValue("llmAgent", agent);
  graph.injectValue("llmModel", model);
  graph.injectValue("maxTokens", max_tokens);
  graph.registerCallback(cliLoadingPlugin({ nodeId: "mulmoScript", message: "Generating script..." }));

  const result = await graph.run<{ path: string }>();
  if (!result?.writeJSON?.path) {
    showErrorMessage("Script generation failed. Please try again.");
    return;
  }
  writingMessage(result?.writeJSON?.path ?? "");
};

export const createMulmoScriptFromFile = async (
  fileName: string,
  { templateName, outDirPath, filename, cacheDirPath, llm, llm_model, verbose }: ScriptingParams,
) => {
  mkdir(outDirPath);
  mkdir(cacheDirPath);
  const filePath = path.resolve(process.cwd(), fileName);

  const text = readFileSync(filePath, "utf-8");
  const { agent, model, max_tokens } = llmPair(llm, llm_model);

  const graph = new GraphAI(graphDataText, {
    ...vanillaAgents,
    openAIAgent,
    anthropicAgent,
    geminiAgent,
    groqAgent,
    validateSchemaAgent,
    fileWriteAgent,
  });

  graph.injectValue("sourceText", { text });
  graph.injectValue("systemPrompt", readTemplatePrompt(templateName));
  graph.injectValue("outdir", outDirPath);
  graph.injectValue("fileName", filename);
  graph.injectValue("llmAgent", agent);
  graph.injectValue("llmModel", model);
  graph.injectValue("maxTokens", max_tokens);
  if (!verbose) {
    graph.registerCallback(cliLoadingPlugin({ nodeId: "mulmoScript", message: "Generating script..." }));
  }
  const result = await graph.run<{ path: string }>();
  if (!result?.writeJSON?.path) {
    showErrorMessage("Script generation failed. Please try again.");
    return;
  }
  writingMessage(result?.writeJSON?.path ?? "");
};
