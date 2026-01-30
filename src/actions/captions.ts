import { MulmoStudioContext, MulmoBeat, PublicAPIArgs, mulmoCaptionParamsSchema } from "../types/index.js";
import { GraphAI, GraphAILogger } from "graphai";
import type { GraphData } from "graphai";
import * as agents from "@graphai/vanilla";
import { getHTMLFile, getCaptionImagePath, getOutputStudioFilePath } from "../utils/file.js";
import { localizedText, processLineBreaks } from "../utils/utils.js";
import { renderHTMLToImage, interpolate } from "../utils/html_render.js";
import { MulmoStudioContextMethods, MulmoPresentationStyleMethods } from "../methods/index.js";
import { fileWriteAgent } from "@graphai/vanilla_node_agents";

const vanillaAgents = agents.default ?? agents;

const defaultDelimiters = ["。", "？", "！", ".", "?", "!"];

// Split text by delimiters while keeping delimiters attached to the preceding text
const splitTextByDelimiters = (text: string, delimiters: string[]): string[] => {
  if (!text || delimiters.length === 0) {
    return [text];
  }

  const { segments, current } = [...text].reduce(
    (acc, char) => {
      const newCurrent = acc.current + char;
      if (delimiters.includes(char)) {
        const trimmed = newCurrent.trim();
        return {
          segments: trimmed ? [...acc.segments, trimmed] : acc.segments,
          current: "",
        };
      }
      return { ...acc, current: newCurrent };
    },
    { segments: [] as string[], current: "" },
  );

  const finalSegments = current.trim() ? [...segments, current.trim()] : segments;
  return finalSegments.length > 0 ? finalSegments : [text];
};

// Get split texts based on settings
const getSplitTexts = (
  text: string,
  texts: string[] | undefined,
  textSplit: { type: "none" } | { type: "delimiters"; delimiters?: string[] } | undefined,
): string[] => {
  // Manual split takes precedence
  if (texts && texts.length > 0) {
    return texts;
  }
  // No splitting or undefined
  if (!textSplit || textSplit.type === "none") {
    return [text];
  }
  // Split by delimiters
  if (textSplit.type === "delimiters") {
    const delimiters = textSplit.delimiters ?? defaultDelimiters;
    return splitTextByDelimiters(text, delimiters);
  }
  return [text];
};

// Calculate timing ratios based on text length
const calculateTimingRatios = (splitTexts: string[]): number[] => {
  const totalLength = splitTexts.reduce((sum, t) => sum + t.length, 0);
  if (totalLength === 0) {
    return splitTexts.map(() => 1 / splitTexts.length);
  }
  return splitTexts.map((t) => t.length / totalLength);
};

// Convert ratios to cumulative ratios: [0.3, 0.5, 0.2] -> [0, 0.3, 0.8, 1.0]
const calculateCumulativeRatios = (ratios: number[]): number[] => {
  return ratios.reduce((acc, ratio) => [...acc, acc[acc.length - 1] + ratio], [0]);
};

// Generate caption files for a single beat
const generateBeatCaptions = async (beat: MulmoBeat, context: MulmoStudioContext, index: number) => {
  const globalCaptionParamsRaw = context.studio.script.captionParams ?? {};
  const beatCaptionParamsRaw = beat.captionParams ?? {};
  const mergedCaptionParams = mulmoCaptionParamsSchema.parse({
    ...globalCaptionParamsRaw,
    ...beatCaptionParamsRaw,
    styles: Object.hasOwn(beatCaptionParamsRaw, "styles") ? beatCaptionParamsRaw.styles : globalCaptionParamsRaw.styles,
  });
  const canvasSize = MulmoPresentationStyleMethods.getCanvasSize(context.presentationStyle);
  const template = getHTMLFile("caption");

  if (mergedCaptionParams.lang && !context.multiLingual?.[index]?.multiLingualTexts?.[mergedCaptionParams.lang]) {
    GraphAILogger.warn(`No multiLingual caption found for beat ${index}, lang: ${mergedCaptionParams.lang}`);
  }
  const text = localizedText(beat, context.multiLingual?.[index], mergedCaptionParams.lang, context.studio.script.lang);

  // Get beat timing info
  const studioBeat = context.studio.beats[index];
  const beatStartAt = studioBeat.startAt ?? 0;
  const beatDuration = studioBeat.duration ?? 0;
  const introPadding = MulmoStudioContextMethods.getIntroPadding(context);

  // Determine split texts based on captionSplit setting
  const captionSplit = mergedCaptionParams.captionSplit ?? "none";
  const splitTexts = captionSplit === "estimate" ? getSplitTexts(text, beat.texts, mergedCaptionParams.textSplit) : [text];

  // Calculate timing
  const cumulativeRatios = calculateCumulativeRatios(calculateTimingRatios(splitTexts));

  // Generate caption images with absolute timing
  const captionFiles = await Promise.all(
    splitTexts.map(async (segmentText, subIndex) => {
      const imagePath = getCaptionImagePath(context, index, subIndex);
      const htmlData = interpolate(template, {
        caption: processLineBreaks(segmentText),
        width: `${canvasSize.width}`,
        height: `${canvasSize.height}`,
        styles: (mergedCaptionParams.styles ?? []).join(";\n"),
      });
      await renderHTMLToImage(htmlData, imagePath, canvasSize.width, canvasSize.height, false, true);
      return {
        file: imagePath,
        startAt: beatStartAt + introPadding + beatDuration * cumulativeRatios[subIndex],
        endAt: beatStartAt + introPadding + beatDuration * cumulativeRatios[subIndex + 1],
      };
    }),
  );

  return captionFiles;
};

// GraphAI agent for caption generation
const captionGenerationAgent = async (namedInputs: { beat: MulmoBeat; context: MulmoStudioContext; index: number }) => {
  const { beat, context, index } = namedInputs;
  try {
    MulmoStudioContextMethods.setBeatSessionState(context, "caption", index, beat.id, true);
    const captionFiles = await generateBeatCaptions(beat, context, index);
    context.studio.beats[index].captionFiles = captionFiles;
    return captionFiles;
  } finally {
    MulmoStudioContextMethods.setBeatSessionState(context, "caption", index, beat.id, false);
  }
};

export const caption_graph_data: GraphData = {
  version: 0.5,
  nodes: {
    context: {},
    outputStudioFilePath: {},
    map: {
      agent: "mapAgent",
      inputs: { rows: ":context.studio.script.beats", context: ":context" },
      isResult: true,
      params: {
        rowKey: "beat",
        compositeResult: true,
      },
      graph: {
        nodes: {
          generateCaption: {
            agent: captionGenerationAgent,
            inputs: { beat: ":beat", context: ":context", index: ":__mapIndex" },
            isResult: true,
          },
        },
      },
    },
    fileWrite: {
      agent: "fileWriteAgent",
      inputs: {
        onComplete: ":map.generateCaption",
        file: ":outputStudioFilePath",
        text: ":context.studio.toJSON()",
      },
    },
  },
};

export const captions = async (context: MulmoStudioContext, args?: PublicAPIArgs) => {
  const { callbacks } = args ?? {};
  if (MulmoStudioContextMethods.getCaption(context)) {
    try {
      MulmoStudioContextMethods.setSessionState(context, "caption", true);
      const graph = new GraphAI(caption_graph_data, { ...vanillaAgents, fileWriteAgent });
      const outDirPath = MulmoStudioContextMethods.getOutDirPath(context);
      const fileName = MulmoStudioContextMethods.getFileName(context);
      const outputStudioFilePath = getOutputStudioFilePath(outDirPath, fileName);
      graph.injectValue("context", context);
      graph.injectValue("outputStudioFilePath", outputStudioFilePath);
      if (callbacks) {
        callbacks.forEach((callback) => {
          graph.registerCallback(callback);
        });
      }
      await graph.run();
      MulmoStudioContextMethods.setSessionState(context, "caption", false, true);
    } catch (error) {
      MulmoStudioContextMethods.setSessionState(context, "caption", false, false);
      throw error;
    }
  }
  return context;
};
