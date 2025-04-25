import dotenv from "dotenv";
import fs from "fs";
import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import * as nodeAgents from "@graphai/vanilla_node_agents";
import { getBaseDirPath } from "./utils";

dotenv.config();

const graph_data: GraphData = {
  version: 0.5,
  nodes: {
    file: {
      value: "",
    },
    baseDir: {
      value: "",
    },
    prompt: {
      value: "",
    },
    script: {
      agent: "fileReadAgent",
      params: {
        baseDir: ":baseDir",
        outputType: "text",
      },
      inputs: {
        file: ":file",
      },
    },
    llm: {
      agent: "openAIAgent",
      inputs: {
        messages: [
          {
            role: "system",
            content: ":prompt",
          },
          {
            role: "user",
            content: ":script.data",
          },
        ],
      },
      params: {
        response_format: {
          type: "json_object",
        },
      },
      isResult: true,
    },
    fileWrite: {
      agent: "fileWriteAgent",
      inputs: {
        file: ":file",
        text: ":llm.text",
      },
      params: {
        baseDir: ":baseDir",
      },
    },
    output: {
      agent: "copyAgent",
      inputs: {
        text: ":llm.text",
      },
      params: {
        namedKey: "text",
      },
      isResult: true,
      console: {
        after: true,
      },
    },
  },
};

const main = async () => {
  const fileName = process.argv[2];
  const graph = new GraphAI(graph_data, {
    ...agents,
    ...nodeAgents,
  });
  const prompt = fs.readFileSync("./prompts/image_prompt.md", "utf-8");
  graph.injectValue("prompt", prompt);
  graph.injectValue("file", fileName);
  graph.injectValue("baseDir", getBaseDirPath());

  await graph.run();
};

main();
