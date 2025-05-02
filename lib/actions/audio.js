"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audio = void 0;
require("dotenv/config");
const graphai_1 = require("graphai");
const agents = __importStar(require("@graphai/agents"));
const tts_nijivoice_agent_1 = __importDefault(require("../agents/tts_nijivoice_agent"));
const add_bgm_agent_1 = __importDefault(require("../agents/add_bgm_agent"));
const combine_audio_files_agent_1 = __importDefault(require("../agents/combine_audio_files_agent"));
const tts_openai_agent_1 = __importDefault(require("../agents/tts_openai_agent"));
const vanilla_node_agents_1 = require("@graphai/vanilla_node_agents");
const filters_1 = require("../utils/filters");
const file_1 = require("../utils/file");
// const rion_takanashi_voice = "b9277ce3-ba1c-4f6f-9a65-c05ca102ded0"; // たかなし りおん
// const ben_carter_voice = "bc06c63f-fef6-43b6-92f7-67f919bd5dae"; // ベン・カーター
const graph_tts = {
    nodes: {
        path: {
            agent: "pathUtilsAgent",
            params: {
                method: "resolve",
            },
            inputs: {
                dirs: ["scratchpad", "${:row.filename}.mp3"],
            },
        },
        preprocessor: {
            agent: (namedInputs) => {
                const { beat, speakers, speechParams } = namedInputs;
                return {
                    voiceId: speakers[beat.speaker].voiceId,
                    speechParams: { ...speechParams, ...beat.speechParams },
                };
            },
            inputs: {
                beat: ":row",
                speechParams: ":script.speechParams",
                speakers: ":script.speechParams.speakers",
            },
        },
        ttsAgent: {
            agent: (namedInputs) => {
                if (namedInputs.provider === "nijivoice") {
                    return "ttsNijivoiceAgent";
                }
                return "ttsOpenaiAgent";
            },
            inputs: {
                provider: ":script.speechParams.provider",
            },
        },
        tts: {
            agent: ":ttsAgent",
            inputs: {
                // text: ":row.ttsText",
                text: ":row.text",
                file: ":path.path",
            },
            params: {
                throwError: true,
                voice: ":preprocessor.voiceId",
                speed: ":preprocessor.speechParams.speed",
                instructions: ":preprocessor.speechParams.instructions",
            },
        },
    },
};
const graph_data = {
    version: 0.5,
    concurrency: 8,
    nodes: {
        studio: {},
        outputFile: {},
        map: {
            agent: "mapAgent",
            inputs: { rows: ":studio.beats", script: ":studio.script" },
            graph: graph_tts,
        },
        combineFiles: {
            agent: "combineAudioFilesAgent",
            inputs: {
                map: ":map",
                studio: ":studio",
                combinedFileName: "./output/${:studio.filename}.mp3",
            },
            isResult: true,
        },
        fileWrite: {
            agent: "fileWriteAgent",
            inputs: {
                file: "./output/${:studio.filename}_studio.json",
                text: ":combineFiles.studio.toJSON()",
            },
            params: { baseDir: __dirname + "/../../" },
        },
        addBGM: {
            agent: "addBGMAgent",
            params: {
                musicFileName: process.env.PATH_BGM ?? "./music/StarsBeyondEx.mp3",
            },
            console: {
                before: true,
            },
            inputs: {
                voiceFile: ":combineFiles.fileName",
                outFileName: "./output/${:studio.filename}_bgm.mp3",
                outputFile: ":outputFile",
                script: ":studio.script",
            },
            isResult: true,
        },
        title: {
            agent: "copyAgent",
            params: {
                namedKey: "title",
            },
            console: {
                after: true,
            },
            inputs: {
                title: "\n${:studio.script.title}\n\n${:studio.script.description}\nReference: ${:studio.script.reference}\n",
                waitFor: ":addBGM",
            },
        },
    },
};
const agentFilters = [
    {
        name: "fileCacheAgentFilter",
        agent: filters_1.fileCacheAgentFilter,
        nodeIds: ["tts"],
    },
];
const audio = async (studio, files, concurrency) => {
    const { outDirPath } = files;
    const audioPath = (0, file_1.getOutputBGMFilePath)(outDirPath, studio.filename);
    graph_data.concurrency = concurrency;
    const graph = new graphai_1.GraphAI(graph_data, {
        ...agents,
        pathUtilsAgent: vanilla_node_agents_1.pathUtilsAgent,
        fileWriteAgent: vanilla_node_agents_1.fileWriteAgent,
        ttsOpenaiAgent: tts_openai_agent_1.default,
        ttsNijivoiceAgent: tts_nijivoice_agent_1.default,
        addBGMAgent: add_bgm_agent_1.default,
        combineAudioFilesAgent: combine_audio_files_agent_1.default,
    }, { agentFilters });
    graph.injectValue("studio", studio);
    graph.injectValue("outputFile", audioPath);
    const results = await graph.run();
    const result = results.combineFiles;
    console.log(`Generated: ${result.fileName}`);
};
exports.audio = audio;
