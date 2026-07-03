// Pre-run usage estimator: walks a MulmoScript and returns, per beat and per
// process, the API usage a full generation run would consume. Pure and
// browser-compatible (js-tiktoken is pure JS). No cache awareness: estimates
// assume every asset is generated fresh.
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";
import type { MulmoScript, MulmoPresentationStyle, MulmoBeat, MulmoCanvasDimension, MulmoImageParams, SpeakerData, SpeechOptions } from "../types/index.js";
import type { EstimatedMetric, UsageEstimate } from "../types/usage.js";
import {
  provider2TTSAgent,
  provider2MovieAgent,
  gptImageOutputTokens,
  getModelDuration,
  getModelPricing,
  defaultProviders,
  type ModelPricing,
} from "../types/provider2agent.js";
import { text2SpeechProviderSchema, text2MovieProviderSchema } from "../types/schema.js";
import { MulmoPresentationStyleMethods } from "../methods/mulmo_presentation_style.js";
import { MulmoBeatMethods } from "../methods/mulmo_beat.js";
import { imagePrompt, htmlImageSystemPrompt, translateSystemPrompt, translatePrompts } from "./prompt.js";

const MILLION = 1_000_000;
const LATIN_CHARS_PER_TOKEN = 4;
const CJK_CHARS_PER_SEC = 6;
const LATIN_CHARS_PER_SEC = 15;
// Measured ≈50 audio output tokens per second (docs/api.md § Known gaps, probed in PR #1439).
const OPENAI_TTS_AUDIO_TOKENS_PER_SEC = 50;
// Documented: Gemini TTS audio tokens = 25 per second of audio.
const GEMINI_TTS_AUDIO_TOKENS_PER_SEC = 25;
// A typical generated Tailwind slide is 4-8 KB of HTML.
const HTML_OUTPUT_TOKENS_GUESS = 2000;
const TRANSLATE_OUTPUT_FACTOR = 1.2;
// The translate action doesn't set a model, so @graphai/openai_agent's default applies.
const TRANSLATE_DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MOVIE_DURATION_SEC = 8;
const GPT_IMAGE_FIXED_TOKEN_MODELS = ["gpt-image-1", "gpt-image-1-mini"];

export type EstimateUsageOptions = {
  langs?: string[];
  targetLangs?: string[];
  presentationStyle?: MulmoPresentationStyle;
};

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;
const isKeyOf = <T extends object>(obj: T, key: PropertyKey): key is keyof T => key in obj;

let openAITokenizer: Tiktoken | undefined;
const countOpenAITokens = (text: string): number => {
  // Lazy: building the o200k_base BPE table is expensive and most importers never estimate.
  openAITokenizer = openAITokenizer ?? new Tiktoken(o200k_base);
  return openAITokenizer.encode(text).length;
};

const cjkPattern = /[⺀-鿿가-힯豈-﫿ｦ-ﾟ]/g;
const countCjkChars = (text: string): number => (text.match(cjkPattern) ?? []).length;

const countHeuristicTokens = (text: string): number => {
  const cjkChars = countCjkChars(text);
  return cjkChars + Math.ceil((text.length - cjkChars) / LATIN_CHARS_PER_TOKEN);
};

const estimateSpeechSec = (text: string): number => {
  const cjkChars = countCjkChars(text);
  const latinChars = text.length - cjkChars;
  return Math.max(1, Math.round(cjkChars / CJK_CHARS_PER_SEC + latinChars / LATIN_CHARS_PER_SEC));
};

const exact = (value: number): EstimatedMetric => ({ value, precision: "exact" });
const estimated = (value: number): EstimatedMetric => ({ value, precision: "estimated" });
const metric = (value: number, isExact: boolean): EstimatedMetric => ({ value, precision: isExact ? "exact" : "estimated" });

const computeCostUSD = (pricing: ModelPricing, record: UsageEstimate): number | undefined => {
  const tokenValue = (m: EstimatedMetric | undefined, rate: number | undefined) => (m && rate ? (m.value * rate) / MILLION : 0);
  const total =
    tokenValue(record.inputTokens, pricing.inputPerMTokensUSD) +
    tokenValue(record.outputTokens, pricing.outputPerMTokensUSD) +
    tokenValue(record.inputChars, pricing.perMCharsUSD) +
    (record.predictSec && pricing.perSecUSD ? record.predictSec.value * pricing.perSecUSD : 0) +
    (record.imageCount && pricing.perImageUSD ? record.imageCount.value * pricing.perImageUSD : 0);
  return total > 0 ? total : undefined;
};

const attachCost = (record: UsageEstimate, pricingKey?: string): UsageEstimate => {
  const pricing = getModelPricing(record.provider, pricingKey ?? record.model);
  if (!pricing) {
    return record;
  }
  const costUSD = computeCostUSD(pricing, record);
  return costUSD !== undefined ? { ...record, costUSD, pricingAsOf: pricing.asOf } : record;
};

// ---- TTS ----

type TtsBuilderInput = {
  speaker: SpeakerData;
  speechOptions?: SpeechOptions;
  text: string;
  textIsFinal: boolean;
  beatIndex: number;
  lang: string;
};

const buildOpenAITts = ({ speaker, text, textIsFinal, beatIndex, lang }: TtsBuilderInput): UsageEstimate => {
  const model = speaker.model ?? provider2TTSAgent.openai.defaultModel;
  // gpt-* TTS models are token-billed; legacy tts-1 models are character-billed.
  const tokenMetrics = model.startsWith("gpt-")
    ? {
        inputTokens: metric(countOpenAITokens(text), textIsFinal),
        outputTokens: estimated(estimateSpeechSec(text) * OPENAI_TTS_AUDIO_TOKENS_PER_SEC),
      }
    : {};
  return { process: "tts", beatIndex, lang, provider: "openai", model, inputChars: metric(text.length, textIsFinal), ...tokenMetrics };
};

const buildGeminiTts = ({ speaker, speechOptions, text, beatIndex, lang }: TtsBuilderInput): UsageEstimate => {
  // The gemini TTS agent wraps the transcript in a "Director's Notes" prompt when an instruction is set.
  const prompt = speechOptions?.instruction ? `### DIRECTOR'S NOTES\n${speechOptions.instruction}\n\n#### TRANSCRIPT\n${text}` : text;
  return {
    process: "tts",
    beatIndex,
    lang,
    provider: "gemini",
    model: speaker.model ?? provider2TTSAgent.gemini.defaultModel,
    inputTokens: estimated(countHeuristicTokens(prompt)),
    outputTokens: estimated(estimateSpeechSec(text) * GEMINI_TTS_AUDIO_TOKENS_PER_SEC),
  };
};

const buildGoogleTts = ({ speaker, text, textIsFinal, beatIndex, lang }: TtsBuilderInput): UsageEstimate => {
  // Mirrors the runtime usage record: model falls back to the voice name; billing is per character.
  const model = speaker.model ?? speaker.voiceId;
  return { process: "tts", beatIndex, lang, provider: "google", model, inputChars: metric(text.length, textIsFinal) };
};

const buildElevenLabsTts = ({ speaker, text, textIsFinal, beatIndex, lang }: TtsBuilderInput): UsageEstimate => {
  const model = speaker.model ?? provider2TTSAgent.elevenlabs.defaultModel;
  return { process: "tts", beatIndex, lang, provider: "elevenlabs", model, inputChars: metric(text.length, textIsFinal) };
};

const buildKotodamaTts = ({ speaker, text, textIsFinal, beatIndex, lang }: TtsBuilderInput): UsageEstimate => {
  // Mirrors the runtime usage record: the kotodama agent reports the speaker id as the model.
  return { process: "tts", beatIndex, lang, provider: "kotodama", model: speaker.voiceId, inputChars: metric(text.length, textIsFinal) };
};

const ttsRecordBuilders: Record<string, (input: TtsBuilderInput) => UsageEstimate> = {
  openai: buildOpenAITts,
  gemini: buildGeminiTts,
  google: buildGoogleTts,
  elevenlabs: buildElevenLabsTts,
  kotodama: buildKotodamaTts,
};

const googleTtsPricingKey = (voiceId: string): string | undefined => {
  const tiers: Record<string, string> = {
    neural2: "tts-neural2",
    wavenet: "tts-wavenet",
    studio: "tts-studio",
    chirp: "tts-chirp3-hd",
    standard: "tts-standard",
  };
  const lower = voiceId.toLowerCase();
  const tier = Object.keys(tiers).find((key) => lower.includes(key));
  return tier ? tiers[tier] : undefined;
};

const estimateBeatTts = (script: MulmoScript, style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number, lang: string): UsageEstimate | undefined => {
  if (beat.audio || !beat.text || script.audioParams?.suppressSpeech || !style.speechParams?.speakers) {
    return undefined;
  }
  const speaker = MulmoPresentationStyleMethods.getSpeakerData(style, beat, lang);
  const provider = text2SpeechProviderSchema.parse(speaker.provider);
  const builder = ttsRecordBuilders[provider];
  if (!builder) {
    return undefined; // mock
  }
  // For non-default languages the TTS input is a translation that doesn't exist yet.
  const textIsFinal = lang === (script.lang ?? "en");
  const speechOptions = { ...speaker.speechOptions, ...beat.speechOptions };
  const record = builder({ speaker, speechOptions, text: beat.text, textIsFinal, beatIndex, lang });
  return attachCost(record, provider === "google" ? googleTtsPricingKey(speaker.voiceId) : undefined);
};

// ---- Images / movies / sound effects / lip sync ----

const gptImageSize = (canvasSize: MulmoCanvasDimension): string => {
  if (canvasSize.width > canvasSize.height) {
    return "1536x1024";
  }
  return canvasSize.width < canvasSize.height ? "1024x1536" : "1024x1024";
};

const gptImageOutputMetric = (model: string, canvasSize: MulmoCanvasDimension, quality?: string): EstimatedMetric => {
  const table = gptImageOutputTokens[gptImageSize(canvasSize)];
  const knownQuality = quality === "low" || quality === "medium" || quality === "high" ? quality : undefined;
  // Unspecified quality means API "auto"; assume "high" as the conservative upper bound.
  const tokens = table[knownQuality ?? "high"];
  return metric(tokens, GPT_IMAGE_FIXED_TOKEN_MODELS.includes(model) && knownQuality !== undefined);
};

type ImageRecordInput = {
  process: "image" | "imageReference";
  provider: string;
  model: string;
  prompt: string;
  canvasSize: MulmoCanvasDimension;
  quality?: string;
  beatIndex?: number;
  refKey?: string;
};

const buildImageRecord = ({ process, provider, model, prompt, canvasSize, quality, beatIndex, refKey }: ImageRecordInput): UsageEstimate => {
  const base = { process, beatIndex, refKey, provider, model };
  if (provider === "openai") {
    return { ...base, inputTokens: exact(countOpenAITokens(prompt)), outputTokens: gptImageOutputMetric(model, canvasSize, quality) };
  }
  if (provider === "google") {
    return { ...base, inputTokens: estimated(countHeuristicTokens(prompt)), imageCount: exact(1) };
  }
  return { ...base, imageCount: exact(1) }; // replicate bills per image
};

const isMovieBeat = (beat: MulmoBeat): boolean => Boolean(beat.moviePrompt || beat.image?.type === "movie");

// Mirrors imagePreprocessAgent: no AI image when a plugin renders the beat or the beat is movie-only.
const needsImageGeneration = (beat: MulmoBeat): boolean => !beat.image && !(beat.moviePrompt && !beat.imagePrompt);

const estimateImageGeneration = (style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number): UsageEstimate | undefined => {
  const info = MulmoPresentationStyleMethods.getImageAgentInfo(style, beat);
  const { provider, model, quality } = info.imageParams;
  if (!provider || provider === "mock" || !model) {
    return undefined;
  }
  const prompt = imagePrompt(beat, info.imageParams.style);
  const canvasSize = MulmoPresentationStyleMethods.getCanvasSize(style);
  return attachCost(buildImageRecord({ process: "image", provider, model, prompt, canvasSize, quality, beatIndex }));
};

const estimateHtmlImage = (style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number): UsageEstimate | undefined => {
  const info = MulmoPresentationStyleMethods.getHtmlImageAgentInfo(style);
  if (info.provider === "mock") {
    return undefined;
  }
  const fullPrompt = htmlImageSystemPrompt(MulmoPresentationStyleMethods.getCanvasSize(style)) + "\n" + (MulmoBeatMethods.getHtmlPrompt(beat) ?? "");
  const inputTokens = info.provider === "openai" ? exact(countOpenAITokens(fullPrompt)) : estimated(countHeuristicTokens(fullPrompt));
  return attachCost({
    process: "htmlImage",
    beatIndex,
    provider: info.provider,
    model: info.model,
    inputTokens,
    outputTokens: estimated(HTML_OUTPUT_TOKENS_GUESS),
  });
};

const beatDurationMetric = (beat: MulmoBeat): EstimatedMetric => {
  if (beat.duration !== undefined) {
    return exact(beat.duration);
  }
  return estimated(beat.text ? estimateSpeechSec(beat.text) : DEFAULT_MOVIE_DURATION_SEC);
};

const snapMovieDuration = (provider: keyof typeof provider2MovieAgent, model: string, duration: EstimatedMetric): EstimatedMetric => {
  if (!isKeyOf(provider2MovieAgent[provider].modelParams, model)) {
    return duration;
  }
  const snapped = getModelDuration(provider, model, duration.value);
  return snapped !== undefined ? metric(snapped, duration.precision === "exact") : duration;
};

const estimateMovieGeneration = (
  style: MulmoPresentationStyle,
  beat: MulmoBeat | undefined,
  beatIndex?: number,
  refKey?: string,
): UsageEstimate | undefined => {
  const info = MulmoPresentationStyleMethods.getMovieAgentInfo(style, beat);
  const provider = text2MovieProviderSchema.parse(info.movieParams?.provider ?? defaultProviders.text2movie);
  if (!isKeyOf(provider2MovieAgent, provider) || provider === "mock") {
    return undefined;
  }
  const model = info.movieParams?.model ?? provider2MovieAgent[provider].defaultModel;
  const duration = beat ? beatDurationMetric(beat) : estimated(DEFAULT_MOVIE_DURATION_SEC);
  const predictSec = snapMovieDuration(provider, model, duration);
  return attachCost({ process: refKey === undefined ? "movie" : "movieReference", beatIndex, refKey, provider, model, predictSec });
};

const estimateSoundEffect = (style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number): UsageEstimate => {
  const info = MulmoPresentationStyleMethods.getSoundEffectAgentInfo(style, beat);
  const model = beat.soundEffectParams?.model ?? style.soundEffectParams?.model ?? info.defaultModel;
  const provider = beat.soundEffectParams?.provider ?? style.soundEffectParams?.provider ?? defaultProviders.soundEffect;
  // Replicate bills sound effects by GPU prediction time, which differs from clip duration.
  const predictSec = estimated(beatDurationMetric(beat).value);
  return attachCost({ process: "soundEffect", beatIndex, provider, model, predictSec });
};

const estimateLipSync = (style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number): UsageEstimate => {
  const info = MulmoPresentationStyleMethods.getLipSyncAgentInfo(style, beat);
  const model = beat.lipSyncParams?.model ?? style.lipSyncParams?.model ?? info.defaultModel;
  const provider = beat.lipSyncParams?.provider ?? style.lipSyncParams?.provider ?? defaultProviders.lipSync;
  return attachCost({ process: "lipSync", beatIndex, provider, model, predictSec: beatDurationMetric(beat) });
};

const estimateBeatVisuals = (style: MulmoPresentationStyle, beat: MulmoBeat, beatIndex: number): UsageEstimate[] => {
  if (beat.htmlPrompt) {
    // The image preprocessor returns early for htmlPrompt beats; no other generation runs.
    return [estimateHtmlImage(style, beat, beatIndex)].filter(isDefined);
  }
  return [
    needsImageGeneration(beat) ? estimateImageGeneration(style, beat, beatIndex) : undefined,
    beat.moviePrompt ? estimateMovieGeneration(style, beat, beatIndex) : undefined,
    beat.soundEffectPrompt && isMovieBeat(beat) ? estimateSoundEffect(style, beat, beatIndex) : undefined,
    beat.enableLipSync ? estimateLipSync(style, beat, beatIndex) : undefined,
  ].filter(isDefined);
};

// ---- Reference images / movies (imageParams.images and beat.images) ----

const estimateReferenceImage = (
  style: MulmoPresentationStyle,
  prompt: string,
  canvasSize: MulmoCanvasDimension | undefined,
  refKey: string,
  beatIndex?: number,
) => {
  const info = MulmoPresentationStyleMethods.getImageAgentInfo(style);
  const { provider, model, quality } = info.imageParams;
  if (!provider || provider === "mock" || !model) {
    return undefined;
  }
  // Mirrors generateReferenceImage: the style is appended to the reference prompt.
  const fullPrompt = `${prompt}\n${info.imageParams.style || ""}`;
  const size = canvasSize ?? MulmoPresentationStyleMethods.getCanvasSize(style);
  return attachCost(buildImageRecord({ process: "imageReference", provider, model, prompt: fullPrompt, canvasSize: size, quality, refKey, beatIndex }));
};

const estimateMediaReferences = (style: MulmoPresentationStyle, images: MulmoImageParams["images"], beatIndex?: number): UsageEstimate[] => {
  return Object.entries(images ?? {})
    .map(([refKey, media]) => {
      if (media.type === "imagePrompt") {
        return estimateReferenceImage(style, media.prompt, media.canvasSize, refKey, beatIndex);
      }
      if (media.type === "moviePrompt") {
        return estimateMovieGeneration(style, undefined, beatIndex, refKey);
      }
      return undefined;
    })
    .filter(isDefined);
};

// ---- Translate ----

const buildTranslateInput = (defaultLang: string, text: string, targetLang: string): string => {
  const substitutions: Record<string, string> = { ":lang": defaultLang, ":beat.text": text, ":targetLang": targetLang };
  const prompt = translatePrompts.map((line) => substitutions[line] ?? line).join("\n");
  return translateSystemPrompt + "\n" + prompt;
};

const buildTranslateRecord = (defaultLang: string, text: string, targetLang: string, beatIndex: number): UsageEstimate => {
  const input = buildTranslateInput(defaultLang, text, targetLang);
  return attachCost({
    process: "translate",
    beatIndex,
    lang: targetLang,
    provider: "openai",
    model: TRANSLATE_DEFAULT_MODEL,
    inputTokens: exact(countOpenAITokens(input)),
    outputTokens: estimated(Math.ceil(countOpenAITokens(text) * TRANSLATE_OUTPUT_FACTOR)),
  });
};

const estimateTranslate = (script: MulmoScript, targetLangs: string[]): UsageEstimate[] => {
  const defaultLang = script.lang ?? "en";
  return targetLangs
    .filter((targetLang) => targetLang !== defaultLang)
    .flatMap((targetLang) =>
      script.beats.map((beat, beatIndex) => (beat.text ? buildTranslateRecord(defaultLang, beat.text, targetLang, beatIndex) : undefined)).filter(isDefined),
    );
};

// ---- Entry point ----

const defaultTargetLangs = (style: MulmoPresentationStyle, langs: string[], defaultLang: string): string[] => {
  // Mirrors the translate action's default: the requested languages plus the caption language.
  const candidates = [...langs, style.captionParams?.lang];
  return [...new Set(candidates.filter((lang): lang is string => !!lang && lang !== defaultLang))];
};

export const estimateUsage = (script: MulmoScript, options?: EstimateUsageOptions): UsageEstimate[] => {
  const style = options?.presentationStyle ?? script;
  const defaultLang = script.lang ?? "en";
  const langs = options?.langs ?? [defaultLang];
  const targetLangs = options?.targetLangs ?? defaultTargetLangs(style, langs, defaultLang);
  const beatRecords = script.beats.flatMap((beat, beatIndex) => [
    ...langs.map((lang) => estimateBeatTts(script, style, beat, beatIndex, lang)).filter(isDefined),
    ...estimateBeatVisuals(style, beat, beatIndex),
    ...estimateMediaReferences(style, beat.images, beatIndex),
  ]);
  return [...estimateMediaReferences(style, style.imageParams?.images), ...beatRecords, ...estimateTranslate(script, targetLangs)];
};
