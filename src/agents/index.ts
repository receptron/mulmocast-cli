import addBGMAgent from "./add_bgm_agent.js";
import combineAudioFilesAgent from "./combine_audio_files_agent.js";
import imageGenAIAgent from "./image_genai_agent.js";
import imageOpenaiAgent from "./image_openai_agent.js";
import tavilySearchAgent from "./tavily_agent.js";
import movieGenAIAgent from "./movie_genai_agent.js";
import movieReplicateAgent from "./movie_replicate_agent.js";
import mediaMockAgent from "./media_mock_agent.js";
import ttsElevenlabsAgent from "./tts_elevenlabs_agent.js";
import ttsNijivoiceAgent from "./tts_nijivoice_agent.js";
import ttsOpenaiAgent from "./tts_openai_agent.js";
import ttsGoogleAgent from "./tts_google_agent.js";
import validateSchemaAgent from "./validate_schema_agent.js";
import soundEffectReplicateAgent from "./sound_effect_replicate_agent.js";
import lipSyncReplicateAgent from "./lipsync_replicate_agent.js";
import puppeteerCrawlerAgent from "./puppeteer_crawler_agent.js";

import { browserlessAgent } from "@graphai/browserless_agent";
import { textInputAgent } from "@graphai/input_agents";

import { openAIAgent } from "@graphai/openai_agent";
// import * as vanilla from "@graphai/vanilla";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

export {
  openAIAgent,
  fileWriteAgent,
  browserlessAgent,
  textInputAgent,
  addBGMAgent,
  combineAudioFilesAgent,
  imageGenAIAgent,
  imageOpenaiAgent,
  tavilySearchAgent,
  movieGenAIAgent,
  movieReplicateAgent,
  mediaMockAgent,
  ttsElevenlabsAgent,
  ttsNijivoiceAgent,
  ttsOpenaiAgent,
  ttsGoogleAgent,
  validateSchemaAgent,
  soundEffectReplicateAgent,
  lipSyncReplicateAgent,
  puppeteerCrawlerAgent,
};
