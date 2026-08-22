export const currentMulmoScriptVersion = "1.1";

export const outDirName = "output";
export const audioDirName = "audio";
export const imageDirName = "images";
export const cacheDirName = "cache";

export const pdf_modes = ["slide", "talk", "handout"];
export const pdf_sizes = ["letter", "a4"];
export const languages = ["en", "ja", "fr", "es", "de", "zh-CN", "zh-TW", "ko", "it", "pt", "ar", "hi"];

export const storyToScriptGenerateMode = {
  stepWise: "step_wise",
  oneStep: "one_step",
};

export const bundleTargetLang = ["ja", "en"];

export const ASPECT_RATIOS = ["1:1", "9:16", "16:9"];
export const PRO_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

/**
 * Element ids that generated markup interpolates. Restricting the set — rather than escaping
 * per context — is what makes one id safe in an HTML attribute, a JavaScript string literal
 * inside a `<script>`, and a CSS selector at once. Lives here because `schema.ts` compiles
 * standalone in the types package and can only reach files under `src/types/`.
 */
export const SAFE_ELEMENT_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;
