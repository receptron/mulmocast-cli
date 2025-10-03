export const getAudioInputIdsError = (index: number, fileName: string) => {
  return {
    type: "fileNotExist",
    action: "movie",
    agentName: "combineAudioFiles",
    beatIndex: index,
    fileName: fileName,
  };
};
