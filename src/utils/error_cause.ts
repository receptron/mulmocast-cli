export const urlFileNotFoundType = "urlFileNotFound";
export const fileNotExistType = "fileNotExist";
export const unknownMediaType = "unknownMedia";
export const sourceUndefinedType = "undefinedSourceType";

export const movieAction = "movie";
export const imageAction = "images";
export const aucioAction = "audio";
export const imageReferenceAction = "imageReference";

export const audioFileTarget = "audioFile";
export const imageFileTarget = "imageFile";
export const movieFileTarget = "movieFile";

export const videoSourceTarget = "videoSource";
export const audioSourceTarget = "audioSource";
export const codeTextTarget = "codeText";

export const getAudioInputIdsError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: movieAction,
    target: audioFileTarget,
    agentName: "combineAudioFiles",
    beatIndex: index,
    fileName,
  };
};

export const audioCheckerError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: imageAction,
    target: imageFileTarget,
    agentName: "audioChecker",
    beatIndex: index,
    fileName,
  };
};

export const createVideoFileError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: movieAction,
    target: imageFileTarget,
    agentName: "createVideo",
    beatIndex: index,
    fileName,
  };
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
    action: aucioAction,
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
