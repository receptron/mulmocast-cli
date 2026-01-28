import { getPromptTemplateFilePath, readAndParseJson, readScriptTemplateFile, writingMessage } from "../utils/file.js";
import { mulmoScriptSchema, mulmoPromptTemplateSchema } from "../types/schema.js";
import { MulmoPromptTemplate, MulmoStoryboard, StoryToScriptGenerateMode } from "../types/index.js";
import { GraphAI, GraphAILogger, GraphData } from "graphai";
import { openAIAgent } from "@graphai/openai_agent";
import { anthropicAgent } from "@graphai/anthropic_agent";
import { geminiAgent } from "@graphai/gemini_agent";
import { groqAgent } from "@graphai/groq_agent";
import * as agents from "@graphai/vanilla";
import { graphDataScriptGeneratePrompt, sceneToBeatsPrompt, storyToScriptInfoPrompt, storyToScriptPrompt } from "../utils/prompt.js";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import validateSchemaAgent from "../agents/validate_schema_agent.js";
import { ZodSchema } from "zod";
import { llmPair, settings2GraphAIConfig } from "../utils/utils.js";
import type { LLM } from "../types/provider2agent.js";
import { storyToScriptGenerateMode } from "../types/const.js";
import { cliLoadingPlugin } from "../utils/plugins.js";

const vanillaAgents = agents.default ?? agents;

const createValidatedScriptGraphData = ({
  systemPrompt,
  prompt,
  schema,
  llmAgent,
  llmModel,
  maxTokens,
}: {
  systemPrompt: string;
  prompt: string;
  schema: ZodSchema;
  llmAgent: string;
  llmModel: string;
  maxTokens: string;
}) => {
  return {
    loop: {
      while: ":continue",
    },
    nodes: {
      counter: {
        value: 0,
        update: ":counter.add(1)",
      },
      llm: {
        agent: llmAgent,
        inputs: {
          model: llmModel,
          system: systemPrompt,
          prompt,
          max_tokens: maxTokens,
        },
      },
      validateSchema: {
        agent: "validateSchemaAgent",
        inputs: {
          text: ":llm.text.codeBlock()",
          schema,
        },
        isResult: true,
      },
      continue: {
        agent: ({ isValid, counter }: { isValid: boolean; counter: number }) => {
          if (counter >= 3) {
            GraphAILogger.info("Failed to generate a valid script. Please try again.");
            process.exit(1);
          }
          return !isValid;
        },
        inputs: {
          counter: ":counter",
          isValid: ":validateSchema.isValid",
        },
      },
    },
  };
};

const stepWiseGraphData: GraphData = {
  version: 0.5,
  nodes: {
    scenes: {
      value: [],
    },
    beatsPrompt: {
      value: "",
    },
    scriptInfoPrompt: {
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
    script: {
      agent: "mapAgent",
      inputs: {
        rows: ":scenes",
        prompt: ":beatsPrompt",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      params: {
        compositeResult: true,
      },
      graph: {
        nodes: {
          script: {
            agent: "nestedAgent",
            inputs: {
              prompt: ":prompt",
              row: ":row",
              llmAgent: ":llmAgent",
              llmModel: ":llmModel",
              maxTokens: ":maxTokens",
            },
            graph: createValidatedScriptGraphData({
              systemPrompt: ":prompt",
              prompt: graphDataScriptGeneratePrompt("${:row}"),
              schema: mulmoScriptSchema.shape.beats,
              llmAgent: ":llmAgent",
              llmModel: ":llmModel",
              maxTokens: ":maxTokens",
            }),
          },
          json: {
            agent: "copyAgent",
            inputs: {
              json: ":script.validateSchema.data",
            },
            params: {
              namedKey: "json",
            },
            isResult: true,
          },
        },
      },
    },
    beats: {
      agent: "arrayFlatAgent",
      inputs: {
        array: ":script.json",
      },
      isResult: true,
    },
    scriptInfo: {
      agent: "nestedAgent",
      inputs: {
        prompt: ":scriptInfoPrompt",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      graph: createValidatedScriptGraphData({
        systemPrompt: "",
        prompt: ":prompt",
        schema: mulmoScriptSchema.omit({ beats: true }),
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      }),
    },
    mergedScript: {
      agent: "mergeObjectAgent",
      inputs: {
        items: [":scriptInfo.validateSchema.data", { beats: ":beats.array" }],
      },
    },
    writeJSON: {
      agent: "fileWriteAgent",
      inputs: {
        file: "${:outdir}/${:fileName}-${@now}.json",
        text: ":mergedScript.toJSON()",
      },
      isResult: true,
    },
  },
};

const oneStepGraphData: GraphData = {
  version: 0.5,
  nodes: {
    prompt: {
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
    script: {
      agent: "nestedAgent",
      inputs: {
        prompt: ":prompt",
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      },
      graph: createValidatedScriptGraphData({
        systemPrompt: "",
        prompt: graphDataScriptGeneratePrompt("${:prompt}"),
        schema: mulmoScriptSchema,
        llmAgent: ":llmAgent",
        llmModel: ":llmModel",
        maxTokens: ":maxTokens",
      }),
    },
    json: {
      agent: "copyAgent",
      inputs: {
        json: ":script.validateSchema.data",
      },
      params: {
        namedKey: "json",
      },
      isResult: true,
    },
    writeJSON: {
      agent: "fileWriteAgent",
      inputs: {
        file: "${:outdir}/${:fileName}-${@now}.json",
        text: ":json.toJSON()",
      },
      isResult: true,
    },
  },
};

const generateBeatsPrompt = async (template: MulmoPromptTemplate, beatsPerScene: number, story: MulmoStoryboard) => {
  const allScenes = story.scenes.map((scene) => scene.description).join("\n");
  const sampleBeats = template.scriptName ? (readScriptTemplateFile(template.scriptName).beats ?? []) : [];
  return sceneToBeatsPrompt({ sampleBeats, beatsPerScene, allScenes });
};

const generateScriptInfoPrompt = async (template: MulmoPromptTemplate, story: MulmoStoryboard) => {
  if (!template.scriptName) {
    // TODO: use default schema
    throw new Error("script is not provided");
  }
  const script = readScriptTemplateFile(template.scriptName);
  const { beats: __, ...scriptWithoutBeats } = script;
  return storyToScriptInfoPrompt(scriptWithoutBeats, story);
};

const generateScriptPrompt = async (template: MulmoPromptTemplate, beatsPerScene: number, story: MulmoStoryboard) => {
  if (!template.scriptName) {
    // TODO: use default schema
    throw new Error("script is not provided");
  }
  const script = readScriptTemplateFile(template.scriptName);
  return storyToScriptPrompt(script, beatsPerScene, story);
};

export const storyToScript = async ({
  story,
  beatsPerScene,
  templateName,
  outdir,
  fileName,
  llm,
  llmModel,
  generateMode,
}: {
  story: MulmoStoryboard;
  beatsPerScene: number;
  templateName: string;
  outdir: string;
  fileName: string;
  llm?: LLM;
  llmModel?: string;
  generateMode: StoryToScriptGenerateMode;
}) => {
  const template = readAndParseJson(getPromptTemplateFilePath(templateName), mulmoPromptTemplateSchema);
  const { agent, model, max_tokens } = llmPair(llm, llmModel);

  const beatsPrompt = await generateBeatsPrompt(template, beatsPerScene, story);
  const scriptInfoPrompt = await generateScriptInfoPrompt(template, story);
  const scriptPrompt = await generateScriptPrompt(template, beatsPerScene, story);

  const graphData = generateMode === storyToScriptGenerateMode.stepWise ? stepWiseGraphData : oneStepGraphData;

  const config = settings2GraphAIConfig(undefined, process.env);
  const graph = new GraphAI(
    graphData,
    { ...vanillaAgents, openAIAgent, anthropicAgent, geminiAgent, groqAgent, fileWriteAgent, validateSchemaAgent },
    { config },
  );

  if (generateMode === storyToScriptGenerateMode.stepWise) {
    graph.injectValue("scenes", story.scenes);
    graph.injectValue("beatsPrompt", beatsPrompt);
    graph.injectValue("scriptInfoPrompt", scriptInfoPrompt);
  } else {
    graph.injectValue("prompt", scriptPrompt);
  }

  graph.injectValue("outdir", outdir);
  graph.injectValue("fileName", fileName);
  graph.injectValue("llmAgent", agent);
  graph.injectValue("llmModel", model);
  graph.injectValue("maxTokens", max_tokens);
  graph.registerCallback(cliLoadingPlugin({ nodeId: "script", message: "Generating script..." }));

  const result = await graph.run<{ path: string }>();
  writingMessage(result?.writeJSON?.path ?? "");
};
