import { AgentFunction, AgentFunctionInfo } from "graphai";
import OpenAI from "openai";

export const imageOpenaiAgent: AgentFunction<{ apiKey: string; model: string }, { url: string; buffer: Buffer }, { prompt: string }> = async ({
  namedInputs,
  params,
}) => {
  const { prompt } = namedInputs;
  const { apiKey, model } = params;
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: model ?? "dall-e-3",
    prompt,
    n: 1,
    size: "1792x1024",
  });

  const url = response.data[0].url;
  if (!url) {
    throw new Error(`No url was returned: ${response}`);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  // 2. Read the response as an ArrayBuffer
  const arrayBuffer = await res.arrayBuffer();

  // 3. Convert the ArrayBuffer to a Node.js Buffer and return it along with url
  return { url, buffer: Buffer.from(arrayBuffer) };
};

const imageOpenaiAgentInfo: AgentFunctionInfo = {
  name: "imageOpenaiAgent",
  agent: imageOpenaiAgent,
  mock: imageOpenaiAgent,
  samples: [],
  description: "OpenAI Image agent",
  category: ["image"],
  author: "Receptron Team",
  repository: "https://github.com/receptron/mulmocast-cli/",
  // source: "https://github.com/receptron/mulmocast-cli/blob/main/src/agents/image_openai_agent.ts",
  license: "MIT",
  environmentVariables: ["OPENAI_API_KEY"],
};

export default imageOpenaiAgentInfo;
