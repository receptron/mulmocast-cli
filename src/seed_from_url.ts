import "dotenv/config";
import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import { prompts } from "./agents/prompts_data";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import { browserlessAgent } from "@graphai/browserless_agent";
import validateMulmoScriptAgent from "./agents/validate_mulmo_script_agent";
import { z } from "zod";

const urlsSchema = z.array(z.string().url({ message: "Invalid URL format" }));

const graphData: GraphData = {
  version: 0.5,
  concurrency: 1,
  nodes: {
    urls: {
      value: [],
    },
    // The free version of browserless API doesn't support concurrent execution. Using nestedAgent and loop to make sequential requests.
    fetchResults: {
      agent: "mapAgent",
      inputs: {
        rows: ":urls"
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
            params: {
              throwError: true,
            },
          },
          copyAgent: {
            agent: "copyAgent",
            inputs: {
              text: ":fetcher.text",
            },
            params: {
              namedKey: "text",
            },
            isResult: true,
          }
        },
      }
    },
    sourceText: {
      agent: "arrayJoinAgent",
      inputs: {
        array: ":fetchResults.copyAgent",
      },
      params: {
        separator: "\n\n",
      },
    },
    mulmoScript: {
      agent: "nestedAgent",
      inputs: {
        sourceText: ":sourceText",
      },
      graph: {
        loop: {
          while: ":continue",
        },
        nodes: {
          // If the script is not valid and the counter is less than 3, continue the loop
          continue: {
            agent: ({ isValid, counter }) => {
              return !isValid && counter < 3;
            },
            inputs: {
              isValid: ":validateMulmoScriptAgent.isValid",
              counter: ":counter",
            },
          },
          counter: {
            value: 0,
            update: ":incrementCounter"
          },
          incrementCounter: {
            agent: ({ value }) => value + 1,
            inputs: {
              value: ":counter"
            },
          },
          openAIAgent: {
            agent: "openAIAgent",
            inputs: {
              model: "gpt-4o",
              system: prompts.prompt_seed_from_materials,
              prompt: ":sourceText.text",
            },
          },
          validateMulmoScriptAgent: {
            agent: "validateMulmoScriptAgent",
            inputs: {
              text: ":openAIAgent.text.codeBlock()",
            },
            isResult: true,
          }
        }
      },
    },
    writeJSON: {
      if: ":mulmoScript.validateMulmoScriptAgent.isValid",
      agent: "fileWriteAgent",
      inputs: {
        file: "./tmp/${:fileName}-${@now}.json",
        text: ":mulmoScript.validateMulmoScriptAgent.data.toJSON()",
      },
      console: { after: true, before: true },
      isResult: true,
    },
  }
};


const createMulmoScriptFromUrl = async (urls: string[]) => {
  const parsedUrls = urlsSchema.parse(urls);

  const graph = new GraphAI(graphData, {
    ...agents,
    browserlessAgent,
    validateMulmoScriptAgent,
    fileWriteAgent,
  });

  graph.injectValue("urls", parsedUrls);

  await graph.run();
}


// temporary main function
const main = async () => {
  const urlsFromArgs = process.argv.slice(2);

  if (urlsFromArgs.length === 0) {
    console.error("Usage: yarn run seed:url <url1> [url2] ...");
    process.exit(1);
  }

  try {
    await createMulmoScriptFromUrl(urlsFromArgs);
  } catch (error) {
    console.error("Error:", error);
    process.exitCode = 1;
  }
};

main();
