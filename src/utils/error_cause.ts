/**
 * Error Definitions for i18n Notifications
 * ----------------------------------------
 * This file provides a set of standardized error action/type/target constants
 * and factory functions that enrich error objects with structured metadata.
 *
 * ## Purpose
 * - Attach `cause` data to `Error` objects for vue-i18n.
 * - Generate consistent i18n keys in the form:
 *     notify.error.{action}.{type}[.{target}]
 * - Provide contextual data (e.g., beatIndex, fileName, agentName) for use in
 *   translation strings.
 *
 * ## Constants
 * - `type`: describes the error type (e.g., fileNotExist, urlFileNotFound).
 * - `action`: the operation being performed (e.g., movie, image, audio).
 * - `target`: the resource involved (e.g., audioFile, imageFile).
 *
 * ## Factory Functions
 * Each factory function (e.g., getAudioInputIdsError, audioCheckerError) returns
 * a plain object with:
 *   - `type`      → error type constant
 *   - `action`    → action constant
 *   - `target`    → target constant (optional)
 *   - `agentName` → name of the agent/tool that produced the error
 *   - `beatIndex` → index of the beat in the current script
 *   - `fileName`  → file name or identifier (if relevant)
 *
 * ## i18n Integration
 * - The UI consumes the generated `{ action, type, target, ... }` to build the i18n key.
 * - Example:
 *     notify.error.movie.fileNotExist.audioFile
 * - Interpolation values (beatIndex, fileName, etc.) are passed as `data` for
 *   translations.
 *
 * ## Notes
 * - If `target` is not required, omit it.
 * - When adding new actions/types/targets, check for consistency with existing ones.
 * - Use descriptive but concise names to avoid translation conflicts.
 *
 * ## Usage in Error Handling
 * - When throwing manually:
 *     `throw new Error("message", { cause });`
 * - When using assertions:
 *     `assert(condition, message, false, causeObject);`
 *   (set the 3rd parameter to `false` and pass the `cause` object as the 4th)
 */

// Error Types
export const urlFileNotFoundType = "urlFileNotFound";
export const fileNotExistType = "fileNotExist";
export const unknownMediaType = "unknownMedia";
export const sourceUndefinedType = "undefinedSourceType";
export const apiErrorType = "apiError";
export const apiKeyMissingType = "apiKeyMissing";
export const invalidResponseType = "invalidResponse";

// Actions
export const movieAction = "movie";
export const imageAction = "images";
export const audioAction = "audio";
export const imageReferenceAction = "imageReference";
export const translateAction = "translate";

// Targets
export const audioFileTarget = "audioFile";
export const imageFileTarget = "imageFile";
export const movieFileTarget = "movieFile";
export const videoSourceTarget = "videoSource";
export const audioSourceTarget = "audioSource";
export const codeTextTarget = "codeText";

// Agent File Not Exist Errors
export const agentFileNotExistError = (agentName: string, action: string, target: string, fileName: string, beatIndex?: number) => {
  return {
    type: fileNotExistType,
    action,
    target,
    agentName,
    fileName,
    ...(beatIndex !== undefined && { beatIndex }),
  };
};

export const getAudioInputIdsError = (index: number, fileName: string) => {
  return agentFileNotExistError("combineAudioFiles", movieAction, audioFileTarget, fileName, index);
};

export const audioCheckerError = (index: number, fileName: string) => {
  return agentFileNotExistError("audioChecker", imageAction, imageFileTarget, fileName, index);
};

export const createVideoFileError = (index: number, fileName: string) => {
  return agentFileNotExistError("createVideo", movieAction, imageFileTarget, fileName, index);
};

// undefinedSource
export const createVideoSourceError = (index: number) => {
  return {
    type: sourceUndefinedType,
    action: movieAction,
    target: videoSourceTarget,
    agentName: "createVideo",
    beatIndex: index,
  };
};

export const invalidAudioSourceError = (beatIndex: number) => {
  return {
    type: sourceUndefinedType,
    action: audioAction,
    target: audioSourceTarget,
    agentName: "getAudioPathOrUrl",
    beatIndex,
  };
};

// 404
export const downLoadReferenceImageError = (key: string, url: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageReferenceAction,
    target: imageFileTarget,
    agentName: "downloadUrl",
    key,
    url,
  };
};

export const downloadImagePluginError = (url: string, imageType: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageAction,
    target: imageType === "image" ? imageFileTarget : movieFileTarget,
    agentName: "imagePlugin",
    url,
  };
};

export const getTextError = (url: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageAction,
    target: codeTextTarget,
    agentName: "mermaid",
    url,
  };
};

//
export const imageReferenceUnknownMediaError = (key: string) => {
  return {
    type: unknownMediaType,
    action: imageReferenceAction,
    key,
  };
};

export const imagePluginUnknownMediaError = (imageType: string) => {
  return {
    type: unknownMediaType,
    action: imageAction,
    target: imageType,
  };
};

// Agent API Key Errors
export const apiKeyMissingError = (agentName: string, action: string, envVarName: string) => {
  return {
    type: apiKeyMissingType,
    action,
    agentName,
    envVarName,
  };
};

// Agent API/Generation Errors
export const agentGenerationError = (agentName: string, action: string, target: string, beatIndex?: number) => {
  return {
    type: apiErrorType,
    action,
    target,
    agentName,
    ...(beatIndex !== undefined && { beatIndex }),
  };
};

// Agent Invalid Response Errors
export const agentInvalidResponseError = (agentName: string, action: string, target: string, beatIndex?: number) => {
  return {
    type: invalidResponseType,
    action,
    target,
    agentName,
    ...(beatIndex !== undefined && { beatIndex }),
  };
};

// Translation Errors
export const translateApiKeyMissingError = () => {
  return {
    type: apiKeyMissingType,
    action: translateAction,
    agentName: "translate",
    envVarName: "OPENAI_API_KEY",
  };
};

