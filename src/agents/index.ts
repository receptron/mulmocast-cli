import addBGMAgent from "./add_bgm_agent.js";
import combineAudioFilesAgent from "./combine_audio_files_agent.js";
import imageGoogleAgent from "./image_google_agent.js";
import imageOpenaiAgent from "./image_openai_agent.js";
import tavilySearchAgent from "./tavily_agent.js";
import movieGoogleAgent from "./movie_google_agent.js";
import movieReplicateAgent from "./movie_replicate_agent.js";
import mediaMockAgent from "./media_mock_agent.js";
import ttsElevenlabsAgent from "./tts_elevenlabs_agent.js";
import ttsNijivoiceAgent from "./tts_nijivoice_agent.js";
import ttsOpenaiAgent from "./tts_openai_agent.js";
import validateSchemaAgent from "./validate_schema_agent.js";
import soundEffectReplicateAgent from "./sound_effect_replicate_agent.js";

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
  imageGoogleAgent,
  imageOpenaiAgent,
  tavilySearchAgent,
  movieGoogleAgent,
  movieReplicateAgent,
  mediaMockAgent,
  ttsElevenlabsAgent,
  ttsNijivoiceAgent,
  ttsOpenaiAgent,
  validateSchemaAgent,
  soundEffectReplicateAgent,
};
