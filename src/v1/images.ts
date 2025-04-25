import dotenv from "dotenv";
// import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { GraphAI, GraphData } from "graphai";
import * as agents from "@graphai/agents";
import { PodcastScript, ImageInfo } from "./type";
import { readPodcastScriptFile, getOutputFilePath, mkdir } from "./utils";

dotenv.config();
// const openai = new OpenAI();
import { GoogleAuth } from "google-auth-library";

const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID; // Your Google Cloud Project ID
const GOOGLE_IMAGEN_MODEL = "imagen-3.0-fast-generate-001";
const GOOGLE_IMAGEN_ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/${GOOGLE_IMAGEN_MODEL}:predict`;
const tokenHolder = {
  token: "undefined",
};

type PredictionResponse = {
  predictions?: {
    bytesBase64Encoded?: string;
  }[];
};

async function generateImage(prompt: string, script: PodcastScript): Promise<Buffer | undefined> {
  try {
    // Prepare the payload for the API request
    const payload = {
      instances: [
        {
          prompt: prompt,
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: script.aspectRatio ?? "16:9",
        safetySetting: "block_only_high",
      },
    };

    // Make the API call using fetch
    const response = await fetch(GOOGLE_IMAGEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenHolder.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const responseData: PredictionResponse = await response.json();

    // Parse and return the generated image URL or data
    const predictions = responseData.predictions;
    if (predictions && predictions.length > 0) {
      const base64Image = predictions[0].bytesBase64Encoded;
      if (base64Image) {
        return Buffer.from(base64Image, "base64"); // Decode the base64 image to a buffer
      } else {
        throw new Error("No base64-encoded image data returned from the API.");
      }
    } else {
      // console.log(response);
      console.log("No predictions returned from the API.", responseData, prompt);
      return undefined;
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

const image_agent = async (namedInputs: { row: { index: number; imagePrompt: string }; suffix: string; script: PodcastScript }) => {
  const { row, suffix, script } = namedInputs;
  const relativePath = `./images/${script.filename}/${row.index}${suffix}.png`;
  const imagePath = path.resolve(relativePath);
  if (fs.existsSync(imagePath)) {
    // console.log("cached", imagePath);
    return relativePath;
  }

  try {
    // console.log("generating", row.index, row.imagePrompt);
    const imageBuffer = await generateImage(row.imagePrompt, script);
    if (imageBuffer) {
      fs.writeFileSync(imagePath, imageBuffer);
      console.log("generated:", imagePath);
    } else {
      return undefined;
    }
  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }

  /* Dalle.3
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt ? `${prompt}\n${keywords}` : row.text,
    n: 1,
    size: "1024x1024", // "1792x1024",
  });

  const imageRes = await fetch(response.data[0].url!);
 
  const writer = fs.createWriteStream(imagePath);
  if (imageRes.body) {
    const reader = imageRes.body.getReader();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) {
        writer.write(Buffer.from(value));
      }
      done = readerDone;
    }

    writer.end();
    console.log("generated", imagePath);
  } else {
    throw new Error("Response body is null or undefined");
  }

  // Return a Promise that resolves when the writable stream is finished
  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  */
  return relativePath;
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 2,
  nodes: {
    script: {
      value: {},
    },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":script.images", script: ":script" },
      isResult: true,
      params: {
        compositeResult: true,
      },
      graph: {
        nodes: {
          plain: {
            agent: image_agent,
            inputs: {
              row: ":row",
              script: ":script",
              suffix: "p",
            },
          },
          output: {
            agent: "copyAgent",
            inputs: {
              index: ":row.index",
              imagePrompt: ":row.imagePrompt",
              image: ":plain",
            },
            isResult: true,
          },
        },
      },
    },
  },
};

const googleAuth = async () => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token!;
};

const main = async () => {
  tokenHolder.token = await googleAuth();

  const arg2 = process.argv[2];
  const { podcastData, fileName } = readPodcastScriptFile(arg2, "ERROR: File does not exist " + arg2);

  const outputFilePath = getOutputFilePath(fileName + ".json");
  const { podcastData: outputJsonData } = readPodcastScriptFile(outputFilePath, "ERROR: File does not exist outputs/" + fileName + ".json");

  mkdir(`images/${outputJsonData.filename}`);
  podcastData.filename = outputJsonData.filename; // Hack: It allows us to use the source script

  const graph = new GraphAI(graph_data, { ...agents });
  graph.injectValue("script", podcastData);
  const results = await graph.run<{ output: ImageInfo[] }>();
  if (results.map?.output) {
    outputJsonData.images = results.map?.output;
    fs.writeFileSync(outputFilePath, JSON.stringify(outputJsonData, null, 2));
  }
};

main();
