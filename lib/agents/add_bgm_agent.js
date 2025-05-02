"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const methods_1 = require("../methods");
const addBGMAgent = async ({ namedInputs, params, }) => {
    const { voiceFile, outputFile, script } = namedInputs;
    const { musicFileName } = params;
    const musicFile = path_1.default.resolve(musicFileName);
    const promise = new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(voiceFile, (err, metadata) => {
            if (err) {
                console.error("Error getting metadata: " + err.message);
                reject(err);
            }
            const speechDuration = metadata.format.duration;
            const padding = methods_1.MulmoScriptMethods.getPadding(script);
            const totalDuration = (padding * 2) / 1000 + Math.round(speechDuration ?? 0);
            console.log("totalDucation:", speechDuration, totalDuration);
            const command = (0, fluent_ffmpeg_1.default)();
            command
                .input(musicFile)
                .input(voiceFile)
                .complexFilter([
                // Add a 2-second delay to the speech
                `[1:a]adelay=${padding}|${padding}, volume=4[a1]`, // 4000ms delay for both left and right channels
                // Set the background music volume to 0.2
                `[0:a]volume=0.2[a0]`,
                // Mix the delayed speech and the background music
                `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=3[amixed]`,
                // Trim the output to the length of speech + 8 seconds
                `[amixed]atrim=start=0:end=${totalDuration}[trimmed]`,
                // Add fade out effect for the last 4 seconds
                `[trimmed]afade=t=out:st=${totalDuration - padding / 1000}:d=${padding}`,
            ])
                .on("error", (err) => {
                console.error("Error: " + err.message);
                reject(err);
            })
                .on("end", () => {
                resolve(0);
            })
                .save(outputFile);
        });
    });
    await promise;
    return outputFile;
};
const addBGMAgentInfo = {
    name: "addBGMAgent",
    agent: addBGMAgent,
    mock: addBGMAgent,
    samples: [],
    description: "addBGMAgent",
    category: ["ffmpeg"],
    author: "satoshi nakajima",
    repository: "https://github.com/snakajima/ai-podcaster",
    license: "MIT",
};
exports.default = addBGMAgentInfo;
