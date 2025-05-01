import "dotenv/config";
import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import { prompts } from "./agents/prompts_data";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import { browserlessAgent } from "@graphai/browserless_agent";
import validateMulmoScriptAgentInfo from "./agents/validate_mulmo_script_agent";
import { z } from "zod";

const urlsSchema = z.array(z.string().url({ message: "Invalid URL format" }));

const graphData: GraphData = {
  version: 0.5,
  nodes: {
    urls: {
      value: [],
    },
    // The free version of browserless API doesn't support concurrent execution. Using nestedAgent and loop to make sequential requests.
    contents: {
      agent: "nestedAgent",
      inputs: {
        rows: ":urls"
      },
      graph: {
        loop: {
          while: ":continue"
        },
        nodes: {
          continue: {
            agent: ({ fetchedCount, urlsCount }) => {
              return fetchedCount < urlsCount - 1
            },
            inputs: {
              fetchedCount: ":fetchResult.length()",
              urlsCount: ":rows.length()"
            },
          },
          source: {
            agent: ({ urls, fetchedCount }) => {
              return urls[fetchedCount]
            },
            inputs: {
              urls: ":rows",
              fetchedCount: ":fetchResult.length()"
            },
          },
          fetchResult: {
            value: [],
            update: ":reducer.array",
            isResult: true,
          },
          fetcher: {
            agent: "browserlessAgent",
            inputs: {
              url: ":source",
              text_content: true,
            },
            params: {
              throwError: true,
            },
          },
          reducer: {
            agent: "pushAgent",
            inputs: {
              array: ":fetchResult",
              item: ":fetcher.text",
            }
          }
        }
      }
    },
    copyAgent: {
      agent: "copyAgent",
      inputs: {
        text: ":contents.fetchResult",
      },
      console: { after: true },
    },
  }
};


const createMulmoScriptFromUrl = async (urls: string[]) => {
    const parsedUrls = urlsSchema.parse(urls);

    const graph = new GraphAI(graphData, {
      ...agents,
      browserlessAgent,
    });

    graph.injectValue("urls", parsedUrls);

    const result = await graph.run();
    console.log(result);
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
