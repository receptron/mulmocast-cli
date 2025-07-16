import "dotenv/config";
import { userAssert } from "../utils/utils.js";
import {
  MulmoCanvasDimension,
  MulmoBeat,
  SpeechOptions,
  MulmoImageParams,
  Text2SpeechProvider,
  Text2ImageAgentInfo,
  Text2HtmlAgentInfo,
  BeatMediaType,
  MulmoPresentationStyle,
  SpeakerData,
  Text2ImageProvider,
} from "../types/index.js";
import { text2ImageProviderSchema, text2HtmlImageProviderSchema, text2SpeechProviderSchema, mulmoCanvasDimensionSchema } from "../types/schema.js";
import { defaultProviders, provider2ImageAgent, provider2MovieAgent, provider2LLMAgent, provider2SoundEffectAgent } from "../utils/provider2agent.js";

const defaultTextSlideStyles = [
  '*,*::before,*::after{box-sizing:border-box}body,h1,h2,h3,h4,p,figure,blockquote,dl,dd{margin:0}ul[role="list"],ol[role="list"]{list-style:none}html:focus-within{scroll-behavior:smooth}body{min-height:100vh;text-rendering:optimizeSpeed;line-height:1.5}a:not([class]){text-decoration-skip-ink:auto}img,picture{max-width:100%;display:block}input,button,textarea,select{font:inherit}@media(prefers-reduced-motion:reduce){html:focus-within{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}',
  "body { margin: 60px; margin-top: 40px; color:#333; font-size: 30px; font-family: Arial, sans-serif; box-sizing: border-box; height: 100vh }",
  "h1 { font-size: 56px; margin-bottom: 20px; text-align: center }",
  "h2 { font-size: 48px; text-align: center }",
  "h3 { font-size: 36px }",
  "ul { margin-left: 40px } ",
  "pre { background: #eeeecc; font-size: 16px; padding:4px }",
  "p { margin-left: 40px }",
  "table { font-size: 36px; margin: auto; border: 1px solid gray; border-collapse: collapse }",
  "th { border-bottom: 1px solid gray }",
  "td, th { padding: 8px }",
  "tr:nth-child(even) { background-color: #eee }",
];

export const MulmoPresentationStyleMethods = {
  getCanvasSize(presentationStyle: MulmoPresentationStyle): MulmoCanvasDimension {
    return mulmoCanvasDimensionSchema.parse(presentationStyle.canvasSize);
  },
  getSpeechProvider(presentationStyle: MulmoPresentationStyle): Text2SpeechProvider {
    return text2SpeechProviderSchema.parse(presentationStyle.speechParams?.provider);
  },
  getAllSpeechProviders(presentationStyle: MulmoPresentationStyle): Set<Text2SpeechProvider> {
    const providers = new Set<Text2SpeechProvider>();
    const defaultProvider = this.getSpeechProvider(presentationStyle);

    Object.values(presentationStyle.speechParams.speakers).forEach((speaker) => {
      const provider = speaker.provider ?? defaultProvider;
      providers.add(provider);
    });

    return providers;
  },
  getTextSlideStyle(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): string {
    const styles = presentationStyle.textSlideParams?.cssStyles ?? [];
    // NOTES: Taking advantage of CSS override rule (you can redefine it to override)
    const extraStyles = beat.textSlideParams?.cssStyles ?? [];
    // This code allows us to support both string and array of strings for cssStyles
    return [...defaultTextSlideStyles, ...[styles], ...[extraStyles]].flat().join("\n");
  },
  getSpeechOptions(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): SpeechOptions | undefined {
    return { ...presentationStyle.speechParams.speakers[beat.speaker].speechOptions, ...beat.speechOptions };
  },
  getSpeaker(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): SpeakerData {
    userAssert(!!presentationStyle?.speechParams?.speakers, "presentationStyle.speechParams.speakers is not set!!");
    userAssert(!!beat?.speaker, "beat.speaker is not set");
    const speaker = presentationStyle.speechParams.speakers[beat.speaker];
    userAssert(!!speaker, `speaker is not set: speaker "${beat.speaker}"`);
    return speaker;
  },
  getTTSProvider(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): Text2SpeechProvider {
    const speaker = MulmoPresentationStyleMethods.getSpeaker(presentationStyle, beat);
    return speaker.provider ?? presentationStyle.speechParams.provider;
  },
  getTTSModel(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): string | undefined {
    const speaker = MulmoPresentationStyleMethods.getSpeaker(presentationStyle, beat);
    return speaker.model ?? presentationStyle.speechParams.model;
  },
  getVoiceId(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat): string {
    const speaker = MulmoPresentationStyleMethods.getSpeaker(presentationStyle, beat);
    return speaker.voiceId;
  },
  getText2ImageProvider(provider: Text2ImageProvider | undefined): Text2ImageProvider {
    return text2ImageProviderSchema.parse(provider);
  },
  getImageAgentInfo(presentationStyle: MulmoPresentationStyle, beat?: MulmoBeat): Text2ImageAgentInfo {
    // Notice that we copy imageParams from presentationStyle and update
    // provider and model appropriately.
    const imageParams = { ...presentationStyle.imageParams, ...beat?.imageParams };
    const provider = MulmoPresentationStyleMethods.getText2ImageProvider(imageParams?.provider) as keyof typeof provider2ImageAgent;
    const agentInfo = provider2ImageAgent[provider];

    // The default text2image model is gpt-image-1 from OpenAI, and to use it you must have an OpenAI account and have verified your identity. If this is not possible, please specify dall-e-3 as the model.
    const defaultImageParams: MulmoImageParams = {
      provider,
      model: agentInfo.defaultModel,
    };

    return {
      agent: agentInfo.agentName,
      imageParams: { ...defaultImageParams, ...imageParams },
    };
  },
  getMovieAgentInfo(presentationStyle: MulmoPresentationStyle, beat?: MulmoBeat) {
    const movieParams = { ...presentationStyle.movieParams, ...beat?.movieParams };
    const movieProvider = (movieParams?.provider ?? defaultProviders.text2movie) as keyof typeof provider2MovieAgent;
    const agentInfo = provider2MovieAgent[movieProvider];

    return {
      agent: agentInfo.agentName,
      movieParams,
    };
  },
  getSoundEffectAgentInfo(presentationStyle: MulmoPresentationStyle, beat: MulmoBeat) {
    const soundEffectProvider = (beat.soundEffectParams?.provider ??
      presentationStyle.soundEffectParams?.provider ??
      defaultProviders.soundEffect) as keyof typeof provider2SoundEffectAgent;
    const agentInfo = provider2SoundEffectAgent[soundEffectProvider];
    return agentInfo;
  },
  getConcurrency(presentationStyle: MulmoPresentationStyle) {
    /*
    if (presentationStyle.movieParams?.provider === "replicate") {
      return 4;
    }
    */
    const imageAgentInfo = MulmoPresentationStyleMethods.getImageAgentInfo(presentationStyle);
    if (imageAgentInfo.imageParams.provider === "openai") {
      // NOTE: Here are the rate limits of OpenAI's text2image API (1token = 32x32 patch).
      // dall-e-3: 7,500 RPM、15 images per minute (4 images for max resolution)
      // gpt-image-1：3,000,000 TPM、150 images per minute
      if (imageAgentInfo.imageParams.model === provider2ImageAgent.openai.defaultModel) {
        return 16;
      }
    }
    return 4;
  },
  getHtmlImageAgentInfo(presentationStyle: MulmoPresentationStyle): Text2HtmlAgentInfo {
    const provider = text2HtmlImageProviderSchema.parse(presentationStyle.htmlImageParams?.provider) as keyof typeof provider2LLMAgent;
    const defaultConfig = provider2LLMAgent[provider];
    const model = presentationStyle.htmlImageParams?.model ? presentationStyle.htmlImageParams?.model : defaultConfig.defaultModel;

    return {
      provider,
      agent: defaultConfig.agentName,
      model,
      max_tokens: defaultConfig.max_tokens,
    };
  },
  getImageType(_: MulmoPresentationStyle, beat: MulmoBeat): BeatMediaType {
    return beat.image?.type == "movie" ? "movie" : "image";
  },
};
