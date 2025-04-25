import "dotenv/config";
import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import imageGoogleAgent from "../agents/image_google_agent";
import { ImageGoogleConfig } from "../agents/image_google_agent";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";
import { GoogleAuth } from "google-auth-library";

const googleAuth = async () => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token!;
};

const graph_data: GraphData = {
  version: 0.5,
  nodes: {
    imageGenerator: {
      agent: "imageGoogleAgent",
      inputs: {
        prompt: "Beatiful sunset in Hawaii",
      },
    },
    fileWriter: {
      agent: "fileWriteAgent",
      inputs: {
        file: "./output/hawaii.png",
        buffer: ":imageGenerator.buffer",
      },
      params: { baseDir: __dirname + "/../../" },
      isResult: true,
    },
  },
};

const main = async () => {
  const google_config: ImageGoogleConfig = {
    projectId: process.env.GOOGLE_PROJECT_ID,
    token: "",
  };
  google_config.token = await googleAuth();

  const options = {
    config: {
      imageGoogleAgent: google_config,
    },
  };
  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
      imageGoogleAgent,
      fileWriteAgent,
    },
    options,
  );
  const results = await graph.run();
  console.log(results);
};

main();
