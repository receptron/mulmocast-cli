import { AgentFunction, AgentFunctionInfo } from "graphai";

const nijovoiceApiKey = process.env.NIJIVOICE_API_KEY ?? "";

type VoiceJson = {
  generatedVoice: {
    audioFileDownloadUrl: string;
  };
};

export const ttsNijivoiceAgent: AgentFunction = async ({ params, namedInputs }) => {
  const { apiKey, throwError, voice, speed, speed_global } = params;
  const { text } = namedInputs;
  const url = `https://api.nijivoice.com/api/platform/v1/voice-actors/${voice}/generate-voice`;
  const options = {
    method: "POST",
    headers: {
      "x-api-key": apiKey ?? nijovoiceApiKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      format: "mp3",
      speed: speed ? "" + speed : speed_global ? "" + speed_global : "1.0",
      script: text,
    }),
  };

  try {
    const voiceRes = await fetch(url, options);
    const voiceJson: VoiceJson = await voiceRes.json();
    if (voiceJson && voiceJson.generatedVoice && voiceJson.generatedVoice.audioFileDownloadUrl) {
      const audioRes = await fetch(voiceJson.generatedVoice.audioFileDownloadUrl);
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      return { buffer, generatedVoice: voiceJson.generatedVoice };
    }
    if (throwError) {
      console.error(voiceJson);
      throw new Error("TTS Nijivoice Error");
    }
    return {
      error: voiceJson,
    };
  } catch (e) {
    if (throwError) {
      console.error(e);
      throw new Error("TTS Nijivoice Error");
    }
    return {
      error: e,
    };
  }
};

const ttsNijivoiceAgentInfo: AgentFunctionInfo = {
  name: "ttsNijivoiceAgent",
  agent: ttsNijivoiceAgent,
  mock: ttsNijivoiceAgent,
  samples: [],
  description: "TTS nijivoice agent",
  category: ["tts"],
  author: "isamu arimoto",
  repository: "https://github.com/receptron/graphai/",
  license: "MIT",
};

export default ttsNijivoiceAgentInfo;
