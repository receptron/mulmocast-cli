const urlFileNotFoundType = "urlFileNotFound";
const fileNotExistType = "fileNotExist";
const unknownMediaType = "unknownMedia";

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

export const createVideoError = (index: number, fileName: string) => {
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
