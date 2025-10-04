const urlFileNotFoundType = "urlFileNotFound";
const fileNotExistType = "fileNotExist";
const unknownMediaType = "unknownMedia";
const sourceUndefinedType = "undefinedSourceType";
const movieAction = "movie";
const imageAction = "images";
const imageReferenceAction = "imageReference";

export const getAudioInputIdsError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: movieAction,
    target: "audioFile",
    agentName: "combineAudioFiles",
    beatIndex: index,
    fileName,
  };
};

export const audioCheckerError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: imageAction,
    target: "imageFile",
    agentName: "audioChecker",
    beatIndex: index,
    fileName,
  };
};

export const createVideoSourceError = (index: number) => {
  return {
    type: sourceUndefinedType,
    action: movieAction,
    agentName: "createVideo",
    beatIndex: index,
  };
};

export const createVideoFileError = (index: number, fileName: string) => {
  return {
    type: fileNotExistType,
    action: movieAction,
    target: "imageFile",
    agentName: "createVideo",
    beatIndex: index,
    fileName,
  };
};

export const downLoadReferenceImageError = (key: string, url: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageReferenceAction,
    target: "imageFile",
    agentName: "downloadUrl",
    key,
    url,
  };
};

export const downLoadImagePluginError = (url: string, imageType: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageAction,
    target: imageType,
    agentName: "imagePlugin",
    url,
  };
};

export const getTextError = (url: string) => {
  return {
    type: urlFileNotFoundType,
    action: imageAction,
    target: "code",
    agentName: "mermaid",
    url,
  };
};

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
