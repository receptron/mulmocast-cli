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
exports.images = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const graphai_1 = require("graphai");
const agents = __importStar(require("@graphai/agents"));
const methods_1 = require("../methods");
const file_1 = require("../utils/file");
const filters_1 = require("../utils/filters");
const markdown_1 = require("../utils/markdown");
const image_google_agent_1 = __importDefault(require("../agents/image_google_agent"));
const image_openai_agent_1 = __importDefault(require("../agents/image_openai_agent"));
dotenv_1.default.config();
// const openai = new OpenAI();
const google_auth_library_1 = require("google-auth-library");
const defaultStyles = [
    "body { margin: 40px; margin-top: 60px; color:#333 }",
    "h1 { font-size: 60px; text-align: center }",
    "ul { margin-left: 40px } ",
    "li { font-size: 48px }",
];
const preprocess_agent = async (namedInputs) => {
    const { beat, index, suffix, studio } = namedInputs;
    const imageParams = { ...studio.script.imageParams, ...beat.imageParams };
    const prompt = (beat.imagePrompt || beat.text) + "\n" + (imageParams.style || "");
    const imagePath = path_1.default.resolve(`./images/${studio.filename}/${index}${suffix}.png`);
    if (beat.media) {
        if (beat.media.type === "textSlide") {
            const slide = beat.media.slide;
            const markdown = `# ${slide.title}` + slide.bullets.map((text) => `- ${text}`).join("\n");
            // NOTE: If we want to support per-beat CSS style, we need to add textSlideParams to MulmoBeat and process it here.
            await (0, markdown_1.convertMarkdownToImage)(markdown, studio.script.textSlideParams?.cssStyles ?? defaultStyles, imagePath);
        }
    }
    const aspectRatio = methods_1.MulmoScriptMethods.getAspectRatio(studio.script);
    return { path: imagePath, prompt, imageParams, aspectRatio };
};
const graph_data = {
    version: 0.5,
    concurrency: 2,
    nodes: {
        studio: { value: {} },
        text2imageAgent: { value: "" },
        map: {
            agent: "mapAgent",
            inputs: { rows: ":studio.beats", studio: ":studio", text2imageAgent: ":text2imageAgent" },
            isResult: true,
            params: {
                rowKey: "beat",
                compositeResult: true,
            },
            graph: {
                nodes: {
                    preprocessor: {
                        agent: preprocess_agent,
                        inputs: {
                            beat: ":beat",
                            index: ":__mapIndex",
                            studio: ":studio",
                            suffix: "p",
                        },
                    },
                    imageGenerator: {
                        agent: ":text2imageAgent",
                        params: {
                            model: ":preprocessor.imageParams.model",
                            size: ":preprocessor.imageParams.size",
                            aspectRatio: ":preprocessor.aspectRatio",
                        },
                        inputs: {
                            prompt: ":preprocessor.prompt",
                            file: ":preprocessor.path", // only for fileCacheAgentFilter
                            text: ":preprocessor.prompt", // only for fileCacheAgentFilter
                        },
                    },
                    output: {
                        agent: "copyAgent",
                        inputs: {
                            result: ":imageGenerator",
                            image: ":preprocessor.path",
                        },
                        output: {
                            image: ".image",
                        },
                        isResult: true,
                    },
                },
            },
        },
    },
};
const googleAuth = async () => {
    const auth = new google_auth_library_1.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
};
const images = async (studio, files) => {
    const { outDirPath } = files;
    (0, file_1.mkdir)(`images/${studio.filename}`);
    const agentFilters = [
        {
            name: "fileCacheAgentFilter",
            agent: filters_1.fileCacheAgentFilter,
            nodeIds: ["imageGenerator"],
        },
    ];
    const options = {
        agentFilters,
    };
    const injections = {
        studio: studio,
        text2imageAgent: "imageOpenaiAgent",
    };
    // We need to get google's auth token only if the google is the text2image provider.
    if (studio.script.imageParams?.provider === "google") {
        console.log("google was specified as text2image engine");
        const google_config = {
            projectId: process.env.GOOGLE_PROJECT_ID,
            token: "",
        };
        google_config.token = await googleAuth();
        options.config = {
            imageGoogleAgent: google_config,
        };
        injections.text2image = "imageGoogleAgent";
    }
    const graph = new graphai_1.GraphAI(graph_data, { ...agents, imageGoogleAgent: image_google_agent_1.default, imageOpenaiAgent: image_openai_agent_1.default }, options);
    Object.keys(injections).forEach((key) => {
        graph.injectValue(key, injections[key]);
    });
    const results = await graph.run();
    if (results.map?.output) {
        // THe output looks like this. We need to merge it into MultiStudioBeat array
        // [
        //  { image: '/Users/satoshi/git/ai/mulmo/images/test_en/0p.png' },
        //  { image: '/Users/satoshi/git/ai/mulmo/images/test_en/1p.png' }
        // ]
        results.map?.output.forEach((update, index) => {
            const beat = studio.beats[index];
            studio.beats[index] = { ...beat, ...update };
        });
        const outputStudioFilePath = (0, file_1.getOutputStudioFilePath)(outDirPath, studio.filename);
        fs_1.default.writeFileSync(outputStudioFilePath, JSON.stringify(studio, null, 2));
    }
};
exports.images = images;
