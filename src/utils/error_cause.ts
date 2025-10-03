export const getAudioInputIdsError = (index: number, fileName: string) => {
  return {
    type: "fileNotExist",
    action: "movie",
    target: "audioFile",
    agentName: "combineAudioFiles",
    beatIndex: index,
    fileName,
  };
};

export const audioCheckerError = (index: number, fileName: string) => {
  return {
    type: "fileNotExist",
    action: "images",
    target: "imageFile",
    agentName: "audioChecker",
    beatIndex: index,
    fileName,
  };
};

export const createVideoError = (index: number, fileName: string) => {
  return {
    type: "fileNotExist",
    action: "movie",
    target: "imageFile",
    agentName: "createVideo",
    beatIndex: index,
    fileName,
  };
};
