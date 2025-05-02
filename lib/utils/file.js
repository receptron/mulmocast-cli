"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.silentLastPath = exports.silentPath = exports.mkdir = exports.getBaseDirPath = exports.getScratchpadFilePath = exports.getOutputVideoFilePath = exports.getOutputBGMFilePath = exports.getOutputStudioFilePath = void 0;
exports.readMulmoScriptFile = readMulmoScriptFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const const_1 = require("./const");
function readMulmoScriptFile(arg2, errorMessage) {
    const scriptPath = path_1.default.resolve(arg2);
    if (!fs_1.default.existsSync(scriptPath)) {
        if (errorMessage) {
            console.error(errorMessage);
            process.exit(1);
        }
        return null;
    }
    const scriptData = fs_1.default.readFileSync(scriptPath, "utf-8");
    const script = JSON.parse(scriptData);
    const parsedPath = path_1.default.parse(scriptPath);
    return {
        mulmoData: script,
        mulmoDataPath: scriptPath,
        fileName: parsedPath.name,
    };
}
const getOutputStudioFilePath = (outDirPath, fileName) => {
    return path_1.default.resolve(outDirPath, fileName + "_studio.json");
};
exports.getOutputStudioFilePath = getOutputStudioFilePath;
const getOutputBGMFilePath = (outDirPath, fileName) => {
    return path_1.default.resolve(outDirPath, fileName + "_bgm.mp3");
};
exports.getOutputBGMFilePath = getOutputBGMFilePath;
const getOutputVideoFilePath = (outDirPath, fileName) => {
    return path_1.default.resolve(outDirPath, fileName + ".mp4");
};
exports.getOutputVideoFilePath = getOutputVideoFilePath;
const getScratchpadFilePath = (fileName) => {
    const filePath = path_1.default.resolve(const_1.scratchpadDirName + fileName);
    return filePath;
};
exports.getScratchpadFilePath = getScratchpadFilePath;
const getBaseDirPath = () => {
    return path_1.default.resolve("./");
};
exports.getBaseDirPath = getBaseDirPath;
const mkdir = (dirPath) => {
    const currentDir = process.cwd();
    const imagesDir = path_1.default.join(currentDir, dirPath);
    if (!fs_1.default.existsSync(imagesDir)) {
        fs_1.default.mkdirSync(imagesDir, { recursive: true });
    }
};
exports.mkdir = mkdir;
exports.silentPath = path_1.default.resolve(__dirname, "../../music/silent300.mp3");
exports.silentLastPath = path_1.default.resolve(__dirname, "../../music/silent800.mp3");
