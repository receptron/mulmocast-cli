import { AgentFunction, AgentFunctionInfo } from "graphai";

type PredictionResponse = {
  predictions?: {
    bytesBase64Encoded?: string;
  }[];
};

async function generateImage(
  projectId: string | undefined,
  model: string,
  token: string | undefined,
  prompt: string,
  aspectRatio: string,
): Promise<Buffer | undefined> {
  const GOOGLE_IMAGEN_ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:predict`;

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
        aspectRatio: aspectRatio,
        safetySetting: "block_only_high",
      },
    };

    // Make the API call using fetch
    const response = await fetch(GOOGLE_IMAGEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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

export type ImageGoogleConfig = {
  projectId?: string;
  token?: string;
};

export const imageGoogleAgent: AgentFunction<{ model: string; aspectRatio: string }, { buffer: Buffer }, { prompt: string }, ImageGoogleConfig> = async ({
  namedInputs,
  params,
  config,
}) => {
  const { prompt } = namedInputs;
  const aspectRatio = params.aspectRatio ?? "16:9";
  const model = params.model ?? "imagen-3.0-fast-generate-001";
  //const projectId = process.env.GOOGLE_PROJECT_ID; // Your Google Cloud Project ID
  const projectId = config?.projectId;
  const token = config?.token;

  try {
    const buffer = await generateImage(projectId, model, token, prompt, aspectRatio);
    if (buffer) {
      return { buffer };
    }
    throw new Error("ERROR: geneateImage returned undefined");
  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
};

const imageGoogleAgentInfo: AgentFunctionInfo = {
  name: "imageGoogleAgent",
  agent: imageGoogleAgent,
  mock: imageGoogleAgent,
  samples: [],
  description: "Google Image agent",
  category: ["image"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  // source: "https://github.com/receptron/mulmocast-cli/blob/main/src/agents/image_google_agent.ts",
  license: "MIT",
  environmentVariables: [],
};

export default imageGoogleAgentInfo;
